CREATE OR REPLACE FUNCTION public.search_party_ids(
    search_text text,
    tag_ids uuid[] DEFAULT '{}',
    min_similarity real DEFAULT 0.3
)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
    WITH scored AS (
        SELECT
            p.id,
            GREATEST(
                COALESCE(public.similarity(p.name, search_text), 0::real),
                COALESCE(public.similarity(p.description, search_text), 0::real)
            ) AS score
        FROM public.parties AS p
        WHERE
            public.similarity(p.name, search_text) >= min_similarity
            OR public.similarity(p.description, search_text) >= min_similarity
            OR p.name ILIKE '%' || search_text || '%'
            OR p.description ILIKE '%' || search_text || '%'
            OR (
                COALESCE(cardinality(tag_ids), 0) > 0
                AND EXISTS (
                SELECT 1
                FROM public.parties_tags AS pt
                WHERE pt.party_id = p.id
                    AND pt.tag_id = ANY(tag_ids)
                )
            )
    )
    SELECT s.id FROM scored AS s ORDER BY s.score DESC, s.id;
$$;
