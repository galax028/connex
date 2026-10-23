CREATE OR REPLACE FUNCTION rls_auto_enable() RETURNS event_trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE cmd record; tbl name;
BEGIN
    FOR cmd IN
        SELECT *
        FROM pg_event_trigger_ddl_commands()
        WHERE
            command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
            AND object_type IN ('table', 'partitioned table')
    LOOP
        IF cmd.schema_name IS NOT NULL
            AND cmd.schema_name IN ('public')
            AND cmd.schema_name NOT IN ('pg_catalog', 'information_schema')
            AND cmd.schema_name NOT LIKE 'pg_toast%'
            AND cmd.schema_name NOT LIKE 'pg_temp%'
        THEN
            BEGIN
                SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid = cmd.objid;
                EXECUTE format(
                    'ALTER TABLE IF EXISTS %I.%I ENABLE ROW LEVEL SECURITY',
                    cmd.schema_name,
                    tbl
                );
                RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
            END;
        ELSE
            RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)',
                cmd.object_identity,
                cmd.schema_name;
        END IF;
    END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS ensure_rls;
CREATE EVENT TRIGGER ensure_rls ON ddl_command_end
WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
EXECUTE FUNCTION rls_auto_enable();
