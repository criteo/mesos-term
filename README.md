# MesosTerm

**MesosTerm** is a web-based terminal for Mesos. It allows you to execute command
within Mesos containers (UCR only) from a web interface as you would do with
docker exec.

![The interactive web terminal](doc/images/mesos-term.png?raw=true "MesosTerm")

## Features

* Web-based container terminal.
* Authentication againt LDAP.
* Authorizations based on Mesos executor labels.

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

| Parameter                 | Description                                                                              |
|---------------------------|------------------------------------------------------------------------------------------|
| SUPER\_ADMINS             | Comma-separated list of LDAP users and groups having all rights on all containers.       |
| JWT\_SECRET               | Secret used to generate and validate JWT tokens.                                         |
| LDAP\_BASE\_DN            | Base distinguished name from which to search users for authentication.                   |
| LDAP\_PASSWORD            | Password of the LDAP user to bind against LDAP server.                                   |
| LDAP\_URL                 | Url of the LDAP server. Authorizations are disabled if this env variable is not set.     |
| LDAP\_USER                | User DN of the LDAP user to bind against LDAP server.                                    |
| MESOS\_MASTER\_URL        | Url of the Mesos master to fetch the state from.                                         |
| MESOS\_STATE\_CACHE\_TIME | Time in seconds before invalidating the cache containing Mesos state.                    |
| NODE\_ENV                 | Must be "production" for express to run in production mode.                              |
| SESSION\_SECRET           | Secret used to encrypt session cookie.                                                   |

## Authorizations model

**MesosTerm** support a two-level authorization model allowing certain users
to be super-admins able to debug any container in Mesos and other users
considered as admins and defined per Mesos task.

Super-admins users must be mentionned in the SUPER\_ADMINS environment
as a comma-separated list of LDAP users and groups.

Admins users able to debug an applications must be mentionned as a comma-separated
list of LDAP users and groups in the DEBUG\_GRANTED\_TO task labels. Here is an
example using Marathon.

![authorized users](doc/images/authorizations.png?raw=true "Authorizations")

## Mesos state caching

For production Mesos cluster having a few thousands of instances, it might be
slow to retrieve the Mesos state in order to verify the permissions of a user
to spawn a terminal in a container. In order to improve the user experience,
the Mesos state is fetched regularly and cached. The cache is then invalidated
after some time defined by the environment variable called
MESOS\_STATE\_CACHE\_TIME and expressed in seconds.

You can set a big number in order to reduce the load of your Mesos cluster.
Though, it is important to know that **MesosTerm** automatically invalidate
the cache when a terminal is requested for a task that does not exist in
the cache. It allows users to run terminals in newly created instances that
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
