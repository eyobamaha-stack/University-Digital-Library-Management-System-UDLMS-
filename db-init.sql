DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'udlms') THEN
    CREATE ROLE udlms LOGIN PASSWORD 'udlms';
  END IF;
END
$$;

SELECT 'CREATE DATABASE udlms OWNER udlms'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'udlms')\gexec
