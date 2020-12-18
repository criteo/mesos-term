Just look at how the github action CI is launched and reproduce it.

Things to be noticed:
- the openldap container is quite fragile to stop/restart. Better to `docker-compose rm` it when necessary
