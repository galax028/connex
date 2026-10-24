CREATE TABLE party_chat_messages (
    party_id uuid NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    content text NOT NULL,
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY
);

CREATE INDEX idx_party_chat_messages_created_at ON party_chat_messages (party_id, created_at DESC);

GRANT SELECT, INSERT ON party_chat_messages TO authenticated;
GRANT SELECT, INSERT ON party_chat_messages TO service_role;

CREATE POLICY select_party_chat_messages ON party_chat_messages
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM parties_users
        WHERE
            parties_users.party_id = party_chat_messages.party_id
            AND parties_users.user_id = (SELECT auth.uid())
            AND parties_users.status = 'approved'
    )
    OR EXISTS (
        SELECT 1
        FROM parties
        WHERE
            parties.id = party_chat_messages.party_id
            AND parties.organiser_id = (SELECT auth.uid())
    )
);
CREATE POLICY insert_party_chat_messages ON party_chat_messages
FOR INSERT TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
        SELECT 1
        FROM parties_users
        WHERE
            parties_users.party_id = party_chat_messages.party_id
            AND parties_users.user_id = (SELECT auth.uid())
            AND parties_users.status = 'approved'
    )
    OR (
        user_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1
            FROM parties
            WHERE
                parties.id = party_chat_messages.party_id
                AND parties.organiser_id = (SELECT auth.uid())
        )
    )
);

ALTER PUBLICATION supabase_realtime ADD TABLE party_chat_messages;
