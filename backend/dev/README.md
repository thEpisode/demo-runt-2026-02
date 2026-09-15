# Local Oracle (development only)

Not part of the demo deployment. Mirrors the three RUNTPROD tables so the
query compiler can be exercised before the client's database is reachable.

```bash
docker compose -f dev/docker-compose.yml up -d
docker exec -i runt-demo-oracle sqlplus -s RUNTPROD/runtdemo@//localhost:1521/FREEPDB1 < dev/seed.sql
```

Connection used by `config/default.json`:
`RUNTPROD/runtdemo@localhost:1521/FREEPDB1`
