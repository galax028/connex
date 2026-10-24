"use client";

import * as React from "react";
import type {
  ChatMessage,
  MyStatus,
  Party,
  Participant,
  Profile,
} from "./types";
import { CATEGORIES } from "./types";
import { buildSeed, CURRENT_USER_ID } from "./seed";
import { isPast } from "../format";

const STORAGE_KEY = "connex.prototype.v1";

/** sessionStorage flag: the id of a party just created (drives the details-page toast). */
export const CREATED_PARTY_FLAG = "connex.toast.createdPartyId";

export interface PrivacySettings {
  showFaculty: boolean;
  showYear: boolean;
  showBio: boolean;
}

interface PersistedState {
  createdParties: Party[];
  participations: Record<string, { status: Participant["status"]; joinedAt: string }>;
  myMessages: ChatMessage[];
  privacy: PrivacySettings;
  profileEdits: ProfileEdits;
}

interface ProfileEdits {
  bio: string | null;
  interests: string[] | null;
}

interface StoreData {
  parties: Party[];
  messages: ChatMessage[];
}

export interface CreatePartyInput {
  title: string;
  description: string;
  category: Party["category"];
  date: string;
  time: string;
  endTime?: string;
  location: string;
  area: string;
  locationPin?: Party["locationPin"];
  budgetPerPerson: number;
  capacity: number | null;
  requiresApproval: boolean;
  interests: string[];
}

interface AppContextValue {
  hydrated: boolean;
  profiles: Profile[];
  parties: Party[];
  messages: ChatMessage[];
  currentUserId: string;
  privacy: PrivacySettings;
  getParty: (id: string) => Party | undefined;
  getProfile: (id: string) => Profile | undefined;
  myStatusFor: (party: Party) => MyStatus;
  acceptedParticipants: (party: Party) => Participant[];
  pendingRequests: (party: Party) => Participant[];
  requestJoin: (partyId: string) => { ok: boolean; reason?: string };
  cancelRequest: (partyId: string) => void;
  leaveParty: (partyId: string) => void;
  acceptRequest: (partyId: string, profileId: string) => void;
  declineRequest: (partyId: string, profileId: string) => void;
  createParty: (input: CreatePartyInput) => Party;
  deleteParty: (partyId: string) => void;
  sendMessage: (partyId: string, body: string) => void;
  messagesFor: (partyId: string) => ChatMessage[];
  setPrivacy: (key: keyof PrivacySettings, value: boolean) => void;
  updateProfile: (input: { bio?: string; interests?: string[] }) => void;
}

const AppContext = React.createContext<AppContextValue | null>(null);

function emptyPersisted(): PersistedState {
  return {
    createdParties: [],
    participations: {},
    myMessages: [],
    privacy: { showFaculty: true, showYear: true, showBio: true },
    profileEdits: { bio: null, interests: null },
  };
}

function isParticipantStatus(value: unknown): value is Participant["status"] {
  return value === "accepted" || value === "requested";
}

function normalizeCreatedParty(value: unknown): Party | null {
  if (!value || typeof value !== "object") return null;
  const party = value as Partial<Party>;
  if (
    typeof party.id !== "string" ||
    typeof party.title !== "string" ||
    typeof party.date !== "string" ||
    typeof party.time !== "string"
  )
    return null;
  const participants = Array.isArray(party.participants)
    ? party.participants.filter(
        (p): p is Participant =>
          !!p &&
          typeof (p as Participant).profileId === "string" &&
          isParticipantStatus((p as Participant).status)
      )
    : [];
  return {
    id: party.id,
    title: party.title,
    description: typeof party.description === "string" ? party.description : "",
    category:
      party.category && (CATEGORIES as readonly string[]).includes(party.category)
        ? party.category
        : "other",
    date: party.date,
    time: party.time,
    location: typeof party.location === "string" ? party.location : "",
    area: typeof party.area === "string" ? party.area : "On campus",
    locationPin:
      typeof party.locationPin?.lat === "number" &&
      Number.isFinite(party.locationPin.lat) &&
      typeof party.locationPin?.lng === "number" &&
      Number.isFinite(party.locationPin.lng)
        ? { lat: party.locationPin.lat, lng: party.locationPin.lng }
        : undefined,
    budgetPerPerson:
      typeof party.budgetPerPerson === "number" && Number.isFinite(party.budgetPerPerson)
        ? party.budgetPerPerson
        : 0,
    capacity:
      typeof party.capacity === "number" && Number.isFinite(party.capacity)
        ? party.capacity
        : null,
    requiresApproval: party.requiresApproval !== false,
    creatorId: CURRENT_USER_ID,
    participants,
    interests: Array.isArray(party.interests)
      ? party.interests.filter((i): i is string => typeof i === "string")
      : [],
    createdAt: typeof party.createdAt === "string" ? party.createdAt : new Date().toISOString(),
  };
}

function normalizeMessage(value: unknown): ChatMessage | null {
  if (!value || typeof value !== "object") return null;
  const message = value as Partial<ChatMessage>;
  if (
    typeof message.id !== "string" ||
    typeof message.partyId !== "string" ||
    typeof message.authorId !== "string" ||
    typeof message.body !== "string" ||
    typeof message.createdAt !== "string" ||
    Number.isNaN(new Date(message.createdAt).getTime())
  )
    return null;
  return message as ChatMessage;
}

function loadPersisted(): PersistedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyPersisted();
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const edits = parsed.profileEdits;
    return {
      createdParties: Array.isArray(parsed.createdParties)
        ? parsed.createdParties
            .map(normalizeCreatedParty)
            .filter((p): p is Party => p !== null)
        : [],
      participations: parsed.participations ?? {},
      myMessages: Array.isArray(parsed.myMessages)
        ? parsed.myMessages.map(normalizeMessage).filter((m): m is ChatMessage => m !== null)
        : [],
      privacy: { ...emptyPersisted().privacy, ...parsed.privacy },
      profileEdits: {
        bio: typeof edits?.bio === "string" ? edits.bio : null,
        interests: Array.isArray(edits?.interests)
          ? (edits?.interests ?? []).filter((i): i is string => typeof i === "string").slice(0, 12)
          : null,
      },
    };
  } catch {
    return emptyPersisted();
  }
}

function savePersisted(state: PersistedState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (e.g. private mode) — prototype keeps working in-memory
  }
}

/** After ~1.5s the mock host auto-approves the pending request (prototype). */
const AUTO_APPROVE_MS = 1500;
/** After ~6s a mock student asks to join your newly created party (prototype). */
const MOCK_REQUEST_MS = 6000;

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = React.useState(false);
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [data, setData] = React.useState<StoreData>({ parties: [], messages: [] });
  const [privacy, setPrivacyState] = React.useState<PrivacySettings>(
    emptyPersisted().privacy
  );
  const [profileEdits, setProfileEdits] = React.useState<ProfileEdits>(
    emptyPersisted().profileEdits
  );
  const autoApproveTimers = React.useRef<Map<string, number>>(new Map());
  const profilesRef = React.useRef<Profile[]>([]);

  React.useEffect(() => {
    // Seed + localStorage can only be read after mount (server prerender must
    // match the first client render), so state is intentionally set here.
    /* eslint-disable react-hooks/set-state-in-effect */
    const seed = buildSeed(new Date());
    const persisted = loadPersisted();

    // Requests sent before a reload were auto-approved by the mock host meanwhile.
    const seedParties = seed.parties.map((party) => {
      const mine = persisted.participations[party.id];
      if (!mine || party.creatorId === CURRENT_USER_ID) return party;
      if (!isParticipantStatus(mine.status)) return party;
      const others = party.participants.filter((p) => p.profileId !== CURRENT_USER_ID);
      return {
        ...party,
        participants: [
          ...others,
          {
            profileId: CURRENT_USER_ID,
            status: mine.status === "requested" ? ("accepted" as const) : mine.status,
            joinedAt:
              typeof mine.joinedAt === "string" ? mine.joinedAt : new Date().toISOString(),
          },
        ],
      };
    });

    // Keep created parties demoable: a party with no other members gets a mock
    // joiner — a request for approval-based parties, an instant member otherwise.
    const createdFixtures = persisted.createdParties.map((party) => {
      if (party.participants.some((p) => p.profileId !== CURRENT_USER_ID)) return party;
      const joiner = seed.profiles.find((p) => p.id !== CURRENT_USER_ID);
      if (!joiner) return party;
      return {
        ...party,
        participants: [
          ...party.participants,
          {
            profileId: joiner.id,
            status: party.requiresApproval ? ("requested" as const) : ("accepted" as const),
            joinedAt: new Date().toISOString(),
          },
        ],
      };
    });

    // Apply persisted profile edits (bio, interests) onto the mock user.
    const profilesWithEdits = seed.profiles.map((profile) =>
      profile.id === CURRENT_USER_ID
        ? {
            ...profile,
            bio: persisted.profileEdits.bio ?? profile.bio,
            interests: persisted.profileEdits.interests ?? profile.interests,
          }
        : profile
    );

    profilesRef.current = profilesWithEdits;
    setProfiles(profilesWithEdits);
    setData({
      parties: [...createdFixtures, ...seedParties],
      messages: [...persisted.myMessages, ...seed.messages],
    });
    setPrivacyState(persisted.privacy);
    setProfileEdits(persisted.profileEdits);
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Persist every committed change.
  React.useEffect(() => {
    if (!hydrated) return;
    const createdParties = data.parties.filter((p) => p.creatorId === CURRENT_USER_ID);
    const participations: PersistedState["participations"] = {};
    for (const party of data.parties) {
      if (party.creatorId === CURRENT_USER_ID) continue;
      const mine = party.participants.find((p) => p.profileId === CURRENT_USER_ID);
      if (mine) participations[party.id] = { status: mine.status, joinedAt: mine.joinedAt };
    }
    const myMessages = data.messages.filter((m) => m.authorId === CURRENT_USER_ID);
    savePersisted({ createdParties, participations, myMessages, privacy, profileEdits });
  }, [data, privacy, profileEdits, hydrated]);

  React.useEffect(() => {
    const timers = autoApproveTimers.current;
    return () => {
      for (const t of timers.values()) window.clearTimeout(t);
      timers.clear();
    };
  }, []);

  const getParty = React.useCallback(
    (id: string) => data.parties.find((p) => p.id === id),
    [data.parties]
  );

  const getProfile = React.useCallback(
    (id: string) => profiles.find((p) => p.id === id),
    [profiles]
  );

  const myStatusFor = React.useCallback((party: Party): MyStatus => {
    if (party.creatorId === CURRENT_USER_ID) return "creator";
    const mine = party.participants.find((p) => p.profileId === CURRENT_USER_ID);
    if (!mine) return "none";
    return mine.status === "requested" ? "requested" : "joined";
  }, []);

  const acceptedParticipants = React.useCallback(
    (party: Party) => party.participants.filter((p) => p.status === "accepted"),
    []
  );

  const pendingRequests = React.useCallback(
    (party: Party) => party.participants.filter((p) => p.status === "requested"),
    []
  );

  const requestJoin = React.useCallback(
    (partyId: string): { ok: boolean; reason?: string } => {
      const party = data.parties.find((p) => p.id === partyId);
      if (!party) return { ok: false, reason: "not_found" };
      if (party.creatorId === CURRENT_USER_ID) return { ok: false, reason: "own_party" };
      if (party.participants.some((p) => p.profileId === CURRENT_USER_ID))
        return { ok: false, reason: "already" };
      const accepted = party.participants.filter((p) => p.status === "accepted");
      if (party.capacity !== null && accepted.length >= party.capacity)
        return { ok: false, reason: "full" };
      if (isPast(party.date, party.time)) return { ok: false, reason: "past" };

      const joinedAt = new Date().toISOString();
      const nextStatus: Participant["status"] = party.requiresApproval
        ? "requested"
        : "accepted";
      setData((prev) => ({
        ...prev,
        parties: prev.parties.map((p) =>
          p.id === partyId
            ? {
                ...p,
                participants: [
                  ...p.participants,
                  { profileId: CURRENT_USER_ID, status: nextStatus, joinedAt },
                ],
              }
            : p
        ),
      }));

      if (!party.requiresApproval) return { ok: true };

      // Re-check capacity at approval time in case it changed meanwhile.
      const timer = window.setTimeout(() => {
        autoApproveTimers.current.delete(partyId);
        setData((prev) => ({
          ...prev,
          parties: prev.parties.map((p) => {
            if (p.id !== partyId) return p;
            const stillAccepted = p.participants.filter(
              (x) => x.status === "accepted" && x.profileId !== CURRENT_USER_ID
            );
            const mine = p.participants.find((x) => x.profileId === CURRENT_USER_ID);
            if (!mine || mine.status !== "requested") return p;
            if (p.capacity !== null && stillAccepted.length >= p.capacity) return p;
            return {
              ...p,
              participants: p.participants.map((x) =>
                x.profileId === CURRENT_USER_ID ? { ...x, status: "accepted" as const } : x
              ),
            };
          }),
        }));
      }, AUTO_APPROVE_MS);
      autoApproveTimers.current.set(partyId, timer);
      return { ok: true };
    },
    [data.parties]
  );

  const removeMyParticipation = React.useCallback((partyId: string) => {
    const timer = autoApproveTimers.current.get(partyId);
    if (timer) {
      window.clearTimeout(timer);
      autoApproveTimers.current.delete(partyId);
    }
    setData((prev) => ({
      ...prev,
      parties: prev.parties.map((p) =>
        p.id === partyId
          ? { ...p, participants: p.participants.filter((x) => x.profileId !== CURRENT_USER_ID) }
          : p
      ),
    }));
  }, []);

  const cancelRequest = removeMyParticipation;
  const leaveParty = removeMyParticipation;

  const updateParticipantStatus = React.useCallback(
    (partyId: string, profileId: string, status: Participant["status"] | "remove") => {
      setData((prev) => ({
        ...prev,
        parties: prev.parties.map((p) => {
          if (p.id !== partyId) return p;
          if (status === "remove")
            return {
              ...p,
              participants: p.participants.filter((x) => x.profileId !== profileId),
            };
          const accepted = p.participants.filter(
            (x) => x.status === "accepted" && x.profileId !== profileId
          );
          if (status === "accepted" && p.capacity !== null && accepted.length >= p.capacity)
            return p;
          return {
            ...p,
            participants: p.participants.map((x) =>
              x.profileId === profileId ? { ...x, status } : x
            ),
          };
        }),
      }));
    },
    []
  );

  const acceptRequest = React.useCallback(
    (partyId: string, profileId: string) =>
      updateParticipantStatus(partyId, profileId, "accepted"),
    [updateParticipantStatus]
  );

  const declineRequest = React.useCallback(
    (partyId: string, profileId: string) =>
      updateParticipantStatus(partyId, profileId, "remove"),
    [updateParticipantStatus]
  );

  const createParty = React.useCallback(
    (input: CreatePartyInput): Party => {
      const id = `u-${Date.now()}`;
      const nowIso = new Date().toISOString();
      const party: Party = {
        ...input,
        endTime: input.endTime || undefined,
        id,
        creatorId: CURRENT_USER_ID,
        participants: [
          { profileId: CURRENT_USER_ID, status: "accepted" as const, joinedAt: nowIso },
        ],
        createdAt: nowIso,
      };
      setData((prev) => ({ ...prev, parties: [party, ...prev.parties] }));

      // A mock student joins shortly after publishing (prototype demo): they
      // request approval on approval-based plans, or join instantly otherwise.
      window.setTimeout(() => {
        setData((prev) => {
          const target = prev.parties.find((p) => p.id === id);
          if (!target) return prev;
          const joiner = profilesRef.current.find(
            (p) =>
              p.id !== CURRENT_USER_ID &&
              !target.participants.some((x) => x.profileId === p.id)
          );
          if (!joiner) return prev;
          if (target.capacity !== null) {
            const accepted = target.participants.filter((x) => x.status === "accepted");
            if (accepted.length >= target.capacity) return prev;
          }
          return {
            ...prev,
            parties: prev.parties.map((p) =>
              p.id === id
                ? {
                    ...p,
                    participants: [
                      ...p.participants,
                      {
                        profileId: joiner.id,
                        status: p.requiresApproval
                          ? ("requested" as const)
                          : ("accepted" as const),
                        joinedAt: new Date().toISOString(),
                      },
                    ],
                  }
                : p
            ),
          };
        });
      }, MOCK_REQUEST_MS);
      return party;
    },
    []
  );

  const deleteParty = React.useCallback((partyId: string) => {
    setData((prev) => ({
      parties: prev.parties.filter((p) => p.id !== partyId),
      messages: prev.messages.filter((m) => m.partyId !== partyId),
    }));
  }, []);

  const sendMessage = React.useCallback((partyId: string, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const message: ChatMessage = {
      id: `m-me-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      partyId,
      authorId: CURRENT_USER_ID,
      body: trimmed,
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({ ...prev, messages: [...prev.messages, message] }));
  }, []);

  const messagesFor = React.useCallback(
    (partyId: string) => data.messages.filter((m) => m.partyId === partyId),
    [data.messages]
  );

  const setPrivacy = React.useCallback(
    (key: keyof PrivacySettings, value: boolean) => {
      setPrivacyState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateProfile = React.useCallback(
    (input: { bio?: string; interests?: string[] }) => {
      setProfileEdits((prev) => ({
        bio: input.bio !== undefined ? input.bio : prev.bio,
        interests: input.interests !== undefined ? input.interests : prev.interests,
      }));
      setProfiles((prev) =>
        prev.map((profile) =>
          profile.id === CURRENT_USER_ID
            ? {
                ...profile,
                bio: input.bio !== undefined ? input.bio : profile.bio,
                interests:
                  input.interests !== undefined ? input.interests : profile.interests,
              }
            : profile
        )
      );
    },
    []
  );

  const value: AppContextValue = {
    hydrated,
    profiles,
    parties: data.parties,
    messages: data.messages,
    currentUserId: CURRENT_USER_ID,
    privacy,
    getParty,
    getProfile,
    myStatusFor,
    acceptedParticipants,
    pendingRequests,
    requestJoin,
    cancelRequest,
    leaveParty,
    acceptRequest,
    declineRequest,
    createParty,
    deleteParty,
    sendMessage,
    messagesFor,
    setPrivacy,
    updateProfile,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppStoreProvider");
  return ctx;
}

/** True once the store has loaded seed + persisted data on the client. */
export function useHydrated(): boolean {
  return React.useContext(AppContext)?.hydrated ?? false;
}
