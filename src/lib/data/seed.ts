import type { ChatMessage, Party, Profile } from "./types";
import { daysFromToday } from "../format";

export const CURRENT_USER_ID = "me";

/** Offset in days to the next occurrence of a weekday (0=Sun..6=Sat). */
function nextWeekday(target: number): number {
  const today = new Date().getDay();
  return (target - today + 7) % 7 === 0 ? 7 : (target - today + 7) % 7;
}

type SeedProfile = Omit<Profile, "initials" | "color">;

const PROFILES: SeedProfile[] = [
  {
    id: "me",
    name: "Napat",
    faculty: "Engineering",
    year: "Year 3",
    bio: "Looking for people to play badminton with after class. Also down for food runs around Sam Yan.",
    interests: ["badminton", "coding", "thai street food", "movies", "board games"],
  },
  {
    id: "arisa",
    name: "Arisa",
    faculty: "Business Administration",
    year: "Year 2",
    bio: "Organiser of casual badminton evenings. Ask me about court bookings.",
    interests: ["badminton", "hiking", "bubble tea", "language exchange"],
  },
  {
    id: "kwan",
    name: "Kwan",
    faculty: "Communication Arts",
    year: "Year 3",
    bio: "Always hunting for new street food spots near campus.",
    interests: ["thai street food", "bubble tea", "k-pop", "volleyball"],
  },
  {
    id: "benz",
    name: "Benz",
    faculty: "Engineering",
    year: "Year 2",
    bio: "Radiant main. Also up for karaoke after ranked.",
    interests: ["valorant", "karaoke", "board games", "coding"],
  },
  {
    id: "ploy",
    name: "Ploy",
    faculty: "Economics",
    year: "Year 4",
    bio: "K-BBQ researcher. Will travel for good bingsu.",
    interests: ["korean food", "k-pop", "bubble tea", "photography"],
  },
  {
    id: "tide",
    name: "Tide",
    faculty: "Science",
    year: "Year 3",
    bio: "CS major. Study groups > studying alone.",
    interests: ["coding", "exam prep", "running", "board games"],
  },
  {
    id: "mint",
    name: "Mint",
    faculty: "Science",
    year: "Year 2",
    bio: "Board game collector — I own too many.",
    interests: ["board games", "movies", "exam prep", "muay thai"],
  },
  {
    id: "beam",
    name: "Beam",
    faculty: "Fine and Applied Arts",
    year: "Year 4",
    bio: "Film photography and long walks. Sunset chaser.",
    interests: ["photography", "running", "karaoke", "movies"],
  },
  {
    id: "fah",
    name: "Fah",
    faculty: "Arts",
    year: "Year 3",
    bio: "Weekend explorer. Movie club secretary.",
    interests: ["korean food", "movies", "hiking", "muay thai"],
  },
  {
    id: "ton",
    name: "Ton",
    faculty: "Medicine",
    year: "Year 6",
    bio: "Quiet but reliable. Usually free on weekends.",
    interests: ["running", "badminton", "coffee"],
  },
];

const AVATAR_COLORS = [
  "#e11d63",
  "#7c3aed",
  "#0d9488",
  "#d97706",
  "#2563eb",
  "#db2777",
  "#16a34a",
  "#b45309",
  "#4f46e5",
  "#0284c7",
];

const CHAT_SEEDS: Record<string, Array<[authorId: string, minutesAgo: number, body: string]>> = {
  "p-boardgame": [
    ["mint", 185, "Room booked! Table for 6 at Dice & Brew 🎲"],
    ["tide", 170, "I'm bringing Catan and Citadels"],
    ["benz", 96, "Can I come 30 min late? Lab ends at 6:30"],
    ["me", 84, "No rush, we'll start with a quick game first"],
  ],
  "p-hotpot": [
    ["kwan", 300, "สำรองโต๊ะแล้ว มาให้ทัน 17:30 นะคะ"],
    ["ploy", 240, "จะช้ามา 10-15 นาที รดน้ำเสร็จก่อน 🙏"],
  ],
  "p-badminton": [
    ["arisa", 420, "Court 3 confirmed for Tuesday 18:30. Shuttlecocks provided!"],
  ],
};

export interface SeedData {
  profiles: Profile[];
  parties: Party[];
  messages: ChatMessage[];
  currentUserId: string;
}

export function buildSeed(now = new Date()): SeedData {
  const profiles: Profile[] = PROFILES.map((p, i) => ({
    ...p,
    initials: p.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase(),
    color: AVATAR_COLORS[i % AVATAR_COLORS.length],
  }));

  const iso = (minutesAgo: number) =>
    new Date(now.getTime() - minutesAgo * 60000).toISOString();

  const raw: Array<Omit<Party, "createdAt">> = [
    {
      id: "p-bubbletea",
      requiresApproval: true,
      title: "Bubble tea crawl · ชิมชานมสายเดิม",
      description:
        "Hit 3 famous shops around Siam Square in one afternoon and rank them. Come hungry-ish, we'll share so we can try more.",
      category: "food",
      date: daysFromToday(0),
      time: "15:00",
      location: "Siam Square Soi 7",
      area: "Siam",
      budgetPerPerson: 90,
      capacity: 2,
      creatorId: "kwan",
      participants: [
        { profileId: "kwan", status: "accepted", joinedAt: iso(2600) },
        { profileId: "ploy", status: "accepted", joinedAt: iso(2500) },
      ],
      interests: ["bubble tea", "dessert"],
    },
    {
      id: "p-hotpot",
      requiresApproval: true,
      title: "หมูกระทะ Samyan Hotpot Night",
      description:
        "Cheap all-you-can-eat moo krata near MRT Sam Yan. สำหรับคนหิว — students budget friendly, 250฿/head.",
      category: "food",
      date: daysFromToday(1),
      time: "17:30",
      location: "Samyan Mitrtown, 4th floor",
      area: "Sam Yan",
      budgetPerPerson: 250,
      capacity: 6,
      creatorId: "kwan",
      participants: [
        { profileId: "kwan", status: "accepted", joinedAt: iso(3000) },
        { profileId: "ploy", status: "accepted", joinedAt: iso(2400) },
        { profileId: "benz", status: "accepted", joinedAt: iso(2100) },
      ],
      interests: ["thai street food", "dessert"],
    },
    {
      id: "p-badminton",
      requiresApproval: false,
      title: "ตีแบดมินตัน · Badminton Session @ CU Sport",
      description:
        "Casual doubles at CU Sport Complex, court 3. All levels welcome — we rotate pairs every game. แร็เกตให้ยืมได้ถ้าไม่มี.",
      category: "sports",
      date: daysFromToday(1),
      time: "18:30",
      location: "CU Sport Complex, Court 3",
      area: "On campus",
      budgetPerPerson: 120,
      capacity: 4,
      creatorId: "arisa",
      participants: [
        { profileId: "arisa", status: "accepted", joinedAt: iso(4200) },
        { profileId: "kwan", status: "accepted", joinedAt: iso(3800) },
      ],
      interests: ["badminton", "running"],
    },
    {
      id: "p-codingjam",
      requiresApproval: false,
      title: "Side-project night · code & coffee",
      description:
        "Bring your half-finished side project or just your laptop. Quiet co-working, order your own coffee, share progress at the end.",
      category: "studying",
      date: daysFromToday(2),
      time: "19:00",
      location: "Common Ground Sam Yan",
      area: "Sam Yan",
      budgetPerPerson: 120,
      capacity: 6,
      creatorId: "tide",
      participants: [
        { profileId: "tide", status: "accepted", joinedAt: iso(2000) },
      ],
      interests: ["coding", "exam prep"],
    },
    {
      id: "p-valorant",
      requiresApproval: false,
      title: "Valorant 5-stack (casual, no flame)",
      description:
        "Chill 5-stack, unranked until we warm up. Mic optional. มือใหม่ก็มาได้ เล่นเพลิน ๆ ไม่หาว่ากัน.",
      category: "gaming",
      date: daysFromToday(3),
      time: "20:00",
      location: "Esports lounge, Siam Square One",
      area: "Siam",
      budgetPerPerson: 60,
      capacity: 8,
      creatorId: "benz",
      participants: [
        { profileId: "benz", status: "accepted", joinedAt: iso(1500) },
        { profileId: "beam", status: "accepted", joinedAt: iso(1400) },
      ],
      interests: ["valorant"],
    },
    {
      id: "p-movie",
      requiresApproval: false,
      title: "Movie club: Ghibli rerun at Paragon",
      description:
        "Classic Ghibli rerun screening, then quick dessert after to discuss. ดูหนังแล้วไปกินขนมต่อ.",
      category: "arts",
      date: daysFromToday(3),
      time: "19:30",
      location: "Paragon Cineplex, Siam Paragon",
      area: "Siam",
      budgetPerPerson: 220,
      capacity: 5,
      creatorId: "fah",
      participants: [
        { profileId: "fah", status: "accepted", joinedAt: iso(1900) },
        { profileId: "mint", status: "accepted", joinedAt: iso(1800) },
      ],
      interests: ["movies"],
    },
    {
      id: "p-boardgame",
      requiresApproval: true,
      title: "Board game night · บอร์ดเกมค่ะคืนนี้",
      description:
        "Dice & Brew has 100+ titles. Beginners very welcome — we teach every game before starting. มาเล่นด้วยกัน!",
      category: "gaming",
      date: daysFromToday(4),
      time: "19:00",
      location: "Dice & Brew, Siam Square Soi 6",
      area: "Siam",
      budgetPerPerson: 180,
      capacity: 6,
      creatorId: "mint",
      participants: [
        { profileId: "mint", status: "accepted", joinedAt: iso(3100) },
        { profileId: "tide", status: "accepted", joinedAt: iso(3050) },
        { profileId: "benz", status: "accepted", joinedAt: iso(2900) },
        { profileId: CURRENT_USER_ID, status: "accepted", joinedAt: iso(2800) },
      ],
      interests: ["board games", "dessert"],
    },
    {
      id: "p-kbbq",
      requiresApproval: true,
      title: "K-BBQ at Ari · เด็ดเกรียดกรีน",
      description:
        "Unlimited pork set at a well-known Ari spot. Split the bill, bring Tupperware energy. รีวิวดีมาก แต่ต้องจองล่วงหน้า.",
      category: "food",
      date: daysFromToday(5),
      time: "18:00",
      location: "Ari Soi 2 (near BTS Ari)",
      area: "Ari",
      budgetPerPerson: 350,
      capacity: 8,
      creatorId: "ploy",
      participants: [
        { profileId: "ploy", status: "accepted", joinedAt: iso(2600) },
        { profileId: "arisa", status: "accepted", joinedAt: iso(2500) },
        { profileId: "fah", status: "accepted", joinedAt: iso(2300) },
      ],
      interests: ["korean food", "k-pop"],
    },
    {
      id: "p-muaythai",
      requiresApproval: true,
      title: "Muay Thai beginner class · มวยไทย",
      description:
        "Beginner-friendly session, pads provided. Great workout, no experience needed. คลาสเบกินเนอร์ล้วน ๆ ไม่ต้องกลัว.",
      category: "sports",
      date: daysFromToday(6),
      time: "10:00",
      location: "RJ Boxing Gym, Ratchadamnoen",
      area: "Phra Nakhon",
      budgetPerPerson: 300,
      capacity: 6,
      creatorId: "fah",
      participants: [
        { profileId: "fah", status: "accepted", joinedAt: iso(2200) },
      ],
      interests: ["muay thai", "running"],
    },
    {
      id: "p-photowalk",
      requiresApproval: false,
      title: "Photo walk: Old Town · ถ่ายรูปเดินเล่น",
      description:
        "Slow walk from Phra Sumen fort to Khao San backstreets. Any camera works — phones count. Golden hour start.",
      category: "arts",
      date: daysFromToday(7),
      time: "16:00",
      location: "Santichaiprakan Park, Phra Sumen",
      area: "Phra Nakhon",
      budgetPerPerson: 0,
      capacity: 6,
      creatorId: "beam",
      participants: [
        { profileId: "beam", status: "accepted", joinedAt: iso(1200) },
        { profileId: "kwan", status: "accepted", joinedAt: iso(1100) },
      ],
      interests: ["photography", "hiking"],
    },
    {
      id: "p-chatuchak",
      requiresApproval: true,
      title: "Chatuchak weekend trip · ตลาดนัดจตุจักร",
      description:
        "Morning loop through the market: plants, vintage, street food, น้ำมะพรีว. Meet at MRT Kamphaeng Phet exit 2.",
      category: "outdoor",
      date: daysFromToday(nextWeekday(6)),
      time: "10:30",
      location: "MRT Kamphaeng Phet, Exit 2",
      area: "Chatuchak",
      budgetPerPerson: 150,
      capacity: 8,
      creatorId: "arisa",
      participants: [
        { profileId: "arisa", status: "accepted", joinedAt: iso(1700) },
        { profileId: "fah", status: "accepted", joinedAt: iso(1650) },
        { profileId: "mint", status: "accepted", joinedAt: iso(1600) },
      ],
      interests: ["hiking", "thai street food"],
    },
    {
      id: "p-running",
      requiresApproval: false,
      title: "Sunset run 5K · วิ่งเย็นเบญจกิตติ",
      description:
        "Easy pace 5K around Benjakitti forest park, then coconut water. No one gets left behind. วิ่งช้า ๆ ชมพระอาทิตย์ตก.",
      category: "sports",
      date: daysFromToday(1),
      time: "17:30",
      location: "Benjakitti Forest Park, Gate 1",
      area: "Sukhumvit",
      budgetPerPerson: 0,
      capacity: 10,
      creatorId: "beam",
      participants: [
        { profileId: "beam", status: "accepted", joinedAt: iso(1300) },
        { profileId: "tide", status: "accepted", joinedAt: iso(1250) },
        { profileId: "arisa", status: "accepted", joinedAt: iso(1200) },
      ],
      interests: ["running", "hiking"],
    },
    {
      id: "p-karaoke",
      requiresApproval: true,
      title: "Karaoke night · คาราโอเกะร้อน ๆ",
      description:
        "Room for 8, split evenly. Thai + K-pop + whatever the crowd wants. เอาเพลงมาโปรยกันได้เลย.",
      category: "music",
      date: daysFromToday(8),
      time: "20:00",
      location: "MJ Karaoke, Siam Square One branch",
      area: "Siam",
      budgetPerPerson: 280,
      capacity: 8,
      creatorId: "benz",
      participants: [
        { profileId: "benz", status: "accepted", joinedAt: iso(900) },
        { profileId: "beam", status: "accepted", joinedAt: iso(880) },
        { profileId: "ploy", status: "accepted", joinedAt: iso(860) },
      ],
      interests: ["karaoke", "k-pop"],
    },
    {
      id: "p-volleyball",
      requiresApproval: false,
      title: "Volleyball pickup · ตีวอลเลย์หลังเลิกเรียน",
      description:
        "Casual 6v6 rotation on the outdoor courts. Mixed skill levels, friendly vibe, ไม่ซีเรียส.",
      category: "sports",
      date: daysFromToday(9),
      time: "16:00",
      location: "CU outdoor courts, behind Engineering",
      area: "On campus",
      budgetPerPerson: 40,
      capacity: 8,
      creatorId: "mint",
      participants: [
        { profileId: "mint", status: "accepted", joinedAt: iso(800) },
        { profileId: "kwan", status: "accepted", joinedAt: iso(780) },
      ],
      interests: ["volleyball", "badminton"],
    },
    {
      id: "p-study-final",
      requiresApproval: false,
      title: "Finals cram week · ติวข้อสอบสถิติ",
      description:
        "Past-paper sprint sessions for Stat251. Whiteboard + timed sets, phones in the bag.",
      category: "studying",
      date: daysFromToday(-6),
      time: "18:00",
      location: "L Building, study pod 4",
      area: "On campus",
      budgetPerPerson: 0,
      capacity: 6,
      creatorId: "tide",
      participants: [
        { profileId: "tide", status: "accepted", joinedAt: iso(11000) },
        { profileId: "mint", status: "accepted", joinedAt: iso(10900) },
        { profileId: CURRENT_USER_ID, status: "accepted", joinedAt: iso(10800) },
      ],
      interests: ["exam prep"],
    },
    {
      id: "p-bowling",
      requiresApproval: false,
      title: "Bowling @ Esplanade · โบว์ลิ่งหลังสอบ",
      description: "Two games each + shoe rental, then milk tea next door.",
      category: "sports",
      date: daysFromToday(-12),
      time: "19:00",
      location: "Esplanade Ratchadaphisek, 5th floor",
      area: "Chatuchak",
      budgetPerPerson: 260,
      capacity: 6,
      creatorId: "arisa",
      participants: [
        { profileId: "arisa", status: "accepted", joinedAt: iso(17000) },
        { profileId: "benz", status: "accepted", joinedAt: iso(16900) },
        { profileId: CURRENT_USER_ID, status: "accepted", joinedAt: iso(16800) },
      ],
      interests: ["board games"],
    },
  ];

  const parties: Party[] = raw.map((p) => ({
    ...p,
    createdAt: iso(2000 + Math.floor(Math.random() * 2000)),
  }));

  const messages: ChatMessage[] = [];
  for (const [partyId, seeds] of Object.entries(CHAT_SEEDS)) {
    for (const [authorId, minutesAgo, body] of seeds) {
      messages.push({
        id: `m-${partyId}-${authorId}-${minutesAgo}`,
        partyId,
        authorId,
        body,
        createdAt: iso(minutesAgo),
      });
    }
  }

  return {
    profiles,
    parties,
    messages,
    currentUserId: CURRENT_USER_ID,
  };
}
