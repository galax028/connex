CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE faculties (
    id bigint NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    code varchar(2) NOT NULL UNIQUE,
    name text NOT NULL UNIQUE
);

INSERT INTO faculties (code, name) VALUES
('01', 'The Sirindhorn Thai Language Institute'),
('02', 'Office of Academic Affairs'),
('20', 'College of Interdisciplinary and Integrative Studies Chulalongkorn University'),
('21', 'Faculty of Engineering'),
('22', 'Faculty of Arts'),
('23', 'Faculty of Science'),
('24', 'Faculty of Political Science'),
('25', 'Faculty of Architecture'),
('26', 'Faculty of Commerce and Accountancy'),
('27', 'Faculty of Education'),
('28', 'Faculty of Communication Arts'),
('29', 'Faculty of Economics'),
('30', 'Faculty of Medicine'),
('31', 'Faculty of Veterinary Science'),
('32', 'Faculty of Dentistry'),
('33', 'Faculty of Pharmaceutical Sciences'),
('34', 'Faculty of Law'),
('35', 'Faculty of Fine and Applied Arts'),
('36', 'Faculty of Nursing'),
('37', 'Faculty of Allied Health Sciences'),
('38', 'Faculty of Psychology'),
('39', 'Faculty of Sports Science'),
('40', 'Faculty of Integrated Agriculture'),
('49', 'College of Extension and Lifelong Learning for the People Chulalongkorn University'),
('51', 'College of Population Studies'),
('53', 'College of Public Health Sciences'),
('55', 'Language Institute'),
('56', 'Chulalongkorn School of Integrated Innovation'),
('58', 'Sasin Graduate Institute of Business Administration'),
('63', 'The Petroleum and Petrochemical College'),
('92', 'Police Nursing College'),
('99', 'Other University');

GRANT SELECT ON faculties TO authenticated;
GRANT SELECT ON faculties TO service_role;

CREATE POLICY select_faculties ON faculties FOR SELECT TO authenticated USING (true);


CREATE TABLE tags (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    name text NOT NULL UNIQUE
);

INSERT INTO tags (name) VALUES
('drawing'),
('painting'),
('badminton'),
('football'),
('running'),
('basketball'),
('volleyball'),
('dessert'),
('esan food'),
('korean food'),
('street food'),
('tea and coffee'),
('thai food'),
('exam prep'),
('study session'),
('tutoring'),
('coding'),
('hackathon'),
('photographing'),
('board games'),
('esports'),
('valorant'),
('rov'),
('pes efootball'),
('karaoke'),
('movies'),
('concert');

GRANT SELECT, INSERT ON tags TO authenticated;
GRANT SELECT, INSERT ON tags TO service_role;

CREATE POLICY select_tags ON tags FOR SELECT TO authenticated USING (true);
CREATE POLICY insert_tags ON tags FOR INSERT TO authenticated WITH CHECK (true);


CREATE TABLE user_profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    faculty_code varchar(2) REFERENCES faculties(code) ON DELETE SET NULL ON UPDATE CASCADE,
    enrolment_year smallint,
    profile_url text NOT NULL,
    fullname text NOT NULL,
    nickname text,
    biography text
);

CREATE INDEX idx_user_profiles_faculty_code ON user_profiles (faculty_code);

GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_profiles TO service_role;

CREATE POLICY select_user_profiles ON user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY insert_user_profiles ON user_profiles FOR INSERT TO authenticated
WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY update_user_profiles ON user_profiles FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));


CREATE TABLE users_tags (
    user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, tag_id)
);

CREATE INDEX idx_users_tags_tag_id ON users_tags (tag_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON users_tags TO authenticated;
GRANT SELECT, UPDATE ON users_tags TO service_role;

CREATE POLICY select_users_tags ON users_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY insert_users_tags ON users_tags FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY update_users_tags ON users_tags FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY delete_users_tags ON users_tags FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));


CREATE TABLE party_categories (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    name text NOT NULL UNIQUE
);

INSERT INTO party_categories (name) VALUES
('Other'),
('Arts'),
('Food'),
('Gaming'),
('Music'),
('Sightseeing'),
('Sports'),
('Studying');

GRANT SELECT ON party_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON party_categories TO service_role;

CREATE POLICY select_party_categories ON party_categories FOR SELECT TO authenticated USING (true);


CREATE TABLE parties (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    organiser_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    category_id uuid REFERENCES party_categories(id) ON DELETE SET NULL,
    time_start timestamptz NOT NULL,
    time_end timestamptz,
    location text,
    location_description text,
    location_coordinates point,
    estimated_cost integer CHECK (estimated_cost IS NULL OR estimated_cost > 0),
    approval_required boolean NOT NULL DEFAULT false,
    taken_slots smallint DEFAULT 1 CHECK (taken_slots >= 1),
    max_slots smallint CHECK (max_slots IS NULL OR max_slots >= 2),
    CHECK (time_end IS NULL OR time_start < time_end),
    CHECK (max_slots IS NULL OR taken_slots <= max_slots)
);

CREATE INDEX idx_parties_name_trgm ON parties USING gin (name gin_trgm_ops);
CREATE INDEX idx_parties_description_trgm ON parties USING gin (description gin_trgm_ops);
CREATE INDEX idx_parties_time_start ON parties (time_start);
CREATE INDEX idx_parties_category_id ON parties (category_id);
CREATE INDEX idx_parties_organiser_id ON parties (organiser_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON parties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON parties TO service_role;

CREATE POLICY select_parties ON parties FOR SELECT TO authenticated USING (true);
CREATE POLICY insert_parties ON parties FOR INSERT TO authenticated
WITH CHECK (organiser_id = (SELECT auth.uid()));
CREATE POLICY update_parties ON parties FOR UPDATE TO authenticated
USING (organiser_id = (SELECT auth.uid()))
WITH CHECK (organiser_id = (SELECT auth.uid()));
CREATE POLICY delete_parties ON parties FOR DELETE TO authenticated
USING (organiser_id = (SELECT auth.uid()));


CREATE TABLE parties_tags (
    party_id uuid NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (party_id, tag_id)
);

CREATE INDEX idx_parties_tags_tag_id ON parties_tags (tag_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON parties_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON parties_tags TO service_role;

CREATE POLICY select_parties_tags ON parties_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY insert_parties_tags ON parties_tags FOR INSERT TO authenticated
WITH CHECK (EXISTS (
    SELECT 1
    FROM parties
    WHERE
        parties.id = parties_tags.party_id
        AND parties.organiser_id = (SELECT auth.uid())
));
CREATE POLICY update_parties_tags ON parties_tags FOR UPDATE TO authenticated
USING (EXISTS (
    SELECT 1
    FROM parties
    WHERE
        parties.id = parties_tags.party_id
        AND parties.organiser_id = (SELECT auth.uid())
))
WITH CHECK (EXISTS (
    SELECT 1
    FROM parties
    WHERE
        parties.id = parties_tags.party_id
        AND parties.organiser_id = (SELECT auth.uid())
));
CREATE POLICY delete_parties_tags ON parties_tags FOR DELETE TO authenticated
USING (EXISTS (
    SELECT 1
    FROM parties
    WHERE
        parties.id = parties_tags.party_id
        AND parties.organiser_id = (SELECT auth.uid())
));


CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'declined');


CREATE TABLE parties_users (
    party_id uuid NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    status approval_status NOT NULL DEFAULT 'pending',
    PRIMARY KEY (party_id, user_id)
);

CREATE INDEX idx_parties_users_user_id ON parties_users (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON parties_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON parties_users TO service_role;

CREATE POLICY select_parties_users ON parties_users FOR SELECT TO authenticated
USING (
    status = 'approved'
    OR user_id = (SELECT auth.uid())
    OR EXISTS (
        SELECT 1
        FROM parties
        WHERE
            parties.id = parties_users.party_id
            AND parties.organiser_id = (SELECT auth.uid())
    )
);

CREATE POLICY insert_parties_users ON parties_users FOR INSERT TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
        SELECT 1
        FROM parties
        WHERE
            parties.id = parties_users.party_id
            AND (parties.max_slots IS NULL OR parties.taken_slots < parties.max_slots)
            AND (
                EXISTS (
                    SELECT 1
                    FROM parties organiser_check
                    WHERE
                        organiser_check.id = parties_users.party_id
                        AND organiser_check.organiser_id = (SELECT auth.uid())
                )
                OR (
                    (parties.approval_required AND parties_users.status = 'pending')
                    OR (NOT parties.approval_required AND parties_users.status = 'approved')
                )
            )
    )
);

CREATE POLICY update_parties_users_organiser ON parties_users FOR UPDATE TO authenticated
USING (EXISTS (
    SELECT 1
    FROM parties
    WHERE
        parties.id = parties_users.party_id
        AND parties.organiser_id = (SELECT auth.uid())
))
WITH CHECK (EXISTS (
    SELECT 1
    FROM parties
    WHERE
        parties.id = parties_users.party_id
        AND parties.organiser_id = (SELECT auth.uid())
));

CREATE POLICY update_parties_users_re_request ON parties_users FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()) AND status = 'declined')
WITH CHECK (user_id = (SELECT auth.uid()) AND status = 'pending');

CREATE POLICY delete_parties_users ON parties_users FOR DELETE TO authenticated
USING (
    user_id = (SELECT auth.uid())
    OR exists (
        SELECT 1
        FROM parties
        WHERE
            parties.id = parties_users.party_id
            AND parties.organiser_id = (SELECT auth.uid())
    )
);
