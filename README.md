# MesosTerm

**MesosTerm** is a web-based terminal for Mesos. It allows you to execute command
within Mesos containers (UCR only) from a web interface as you would do with
docker exec.

![The interactive web terminal](doc/images/mesos-term.png?raw=true "MesosTerm")

**WARNING**: you might face "Connection has been closed." error messages randomly
when using MesosTerm against Mesos version lower than 1.5.1. This is due to a
race condition mentioned in
[MESOS-7742](https://issues.apache.org/jira/browse/MESOS-7742).
The solution is to upgrade Mesos to a version higher or equal to 1.5.1.

## Features

* Web-based container terminal.
* Authentication againt LDAP.
* Authorizations based on Mesos executor labels.
* Permissions delegation.

## Getting started

To set up a complete environment for testing, ensure docker and docker-compose
are installed on your machine and run:

```
./scripts/tests/setup.sh
```

And then go to [http://localhost:3000](http://localhost:3000).

To get a task ID for running a terminal, you can get one from Marathon
available at [http://localhost:8080](http://localhost:8080). A few
applications have already been created for you.

![Retrieve Task ID](doc/images/task-id.png?raw=true "TaskID")

## Use MesosTerm in production

To run MesosTerm in production you'll need to run the application
with several environment variables used to configure **MesosTerm**.

### Without authorizations

In order to use MesosTerm without authorizations, execute the following
command:

```
docker run --name mesos-term --rm -p 3000:3000 -it \
  -e JWT_SECRET=your-jwt-secret \
  -e MESOS_MASTER_URL=http://mesos-master:5050 \
  -e MESOS_STATE_CACHE_TIME=60 \
  -e NODE_ENV=production \
  -e SESSION_SECRET=your-session-secret \
  clems4ever/mesos-term
```

### With authorizations

In order to use MesosTerm with authorizations, execute the following
command:

```
docker run --name mesos-term --rm -p 3000:3000 -it \
  -e SUPER_ADMINS=admins,harry \
  -e ENABLE_PER_APP_ADMINS=true \ 
  -e ENABLE_RIGHTS_DELEGATION=true \ 
  -e JWT_SECRET=your-jwt-secret \
  -e LDAP_BASE_DN=dc=yourldap,dc=com \
  -e LDAP_PASSWORD=the-admin-password \
  -e LDAP_URL=ldap://yourldap.com \
  -e LDAP_USER=cn=admin,dc=yourldap,dc=com \
  -e MESOS_MASTER_URL=http://mesos-master:5050 \
  -e MESOS_STATE_CACHE_TIME=60 \
  -e NODE_ENV=production \
  -e SESSION_SECRET=your-session-secret \
  clems4ever/mesos-term
```

## Option details

Here are the details of available options.

| Parameter                  | Description                                                                              |
|----------------------------|------------------------------------------------------------------------------------------|
| ENABLE\_PER\_APP\_ADMINS   | If 'true', admins are enabled meaning DEBUG\_GRANTED\_TO label is used to declare        |
|                            | per app admins who can log into the app containers. (Default: false)                     |
| ENABLE\_RIGHTS\_DELEGATION | If 'true', super admins can delegate rights to log into one specific container to one    |
|                            | person for a certain amount of time. (Default: false)                                    |
| JWT\_SECRET                | Secret used to generate and validate JWT tokens.                                         |
| LDAP\_BASE\_DN             | Base distinguished name from which to search users for authentication.                   |
| LDAP\_PASSWORD             | Password of the LDAP user to bind against LDAP server.                                   |
| LDAP\_URL                  | Url of the LDAP server. Authorizations are disabled if this env variable is not set.     |
| LDAP\_USER                 | User DN of the LDAP user to bind against LDAP server.                                    |
| MESOS\_MASTER\_URL         | Url of the Mesos master to fetch the state from.                                         |
| MESOS\_STATE\_CACHE\_TIME  | Time in seconds before invalidating the cache containing Mesos state.                    |
| NODE\_ENV                  | Must be "production" for express to run in production mode.                              |
| SESSION\_SECRET            | Secret used to encrypt session cookie.                                                   |
| SUPER\_ADMINS              | Comma-separated list of LDAP users and groups having all rights on all containers.       |

## Authorizations model

**MesosTerm** support a two-level authorization model allowing certain users
to be super administrator, meaning users able to debug any container in Mesos,
and other users considered as application administrators who can only debug
their own applications.

### Super administrators

Super administrators must be mentionned in the SUPER\_ADMINS environment
as a comma-separated list of LDAP users and/or groups. They have all
permissions in MesosTerm, i.e., they are able to debug any container
be it root or not. They are also able to produce access tokens to delegate
rights to log into a container.

### Application administrators

Application administrators are able to debug their own applications and
therefore they must be mentionned as a comma-separated list of LDAP users
and groups in the DEBUG\_GRANTED\_TO task labels. Here is an
example using Marathon.

![authorized users](doc/images/authorizations.png?raw=true "Authorizations")

For security reasons, it has been decided to not allow admins of an application
to log in a container in the case the Mesos task runs as `root` or no user
(meaning the user running Mesos, i.e., most probably `root`). Only super
administrators can debug those containers.

### Permissions delegation

In some cases, super administrators might want to allow access to a
specific container to a user for a certain amount of time. This is possible
in MesosTerm by producing an access token by using the endpoint /delegate.
Once the access token is generated, give it to the user and let him use it
to log into the container he is allowed to.

The documentation for how to produce an access token is available by sending
a GET on /delegate.

Basically, given you are `john` and you want to allow `bob` to access container
`XYZ` for `1 hour`, in order to produce the token you can perform the following
command:

```
curl -u "john:mypassword" -XPOST -d '{"task_id": "XYZ", "delegate_to": "bob", "expires_in": "1h"}' -H "Content-Type: application/json" http://localhost:3000/delegate
```

## Mesos state caching

For huge production Mesos clusters, it might be slow to retrieve the Mesos state
and get the task information in order to verify the permissions of a user
to log into a container. In order to improve the user experience,
the Mesos state is fetched regularly and cached. The cache is invalidated
after some time defined by the environment variable called
MESOS\_STATE\_CACHE\_TIME and expressed in seconds.

You can set a big number in order to reduce the load of your Mesos cluster.
Though, it is important to know that **MesosTerm** automatically invalidate
the cache when a terminal is requested for a task that does not exist in
the cache. It allows users to log into newly created instances that
might not be yet in the cache.

## License
**MesosTerm** is **licensed** under the **[MIT License]**. The terms of the license are as follows:

    The MIT License (MIT)

    Copyright (c) 2016 - Clement Michaud

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
    CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[MIT License]: https://opensource.org/licenses/MIT
