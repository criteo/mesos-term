# MesosTerm

**MesosTerm** is a web-based terminal for Mesos. It allows you to execute commands
within Mesos containers (UCR only) from a web interface as you would do with
docker exec.

![The interactive web terminal](doc/images/mesos-term.png?raw=true "MesosTerm")

**WARNING**: you might face "Connection has been closed." error messages randomly
when using MesosTerm against Mesos version lower than 1.5.1. This is due to a
race condition mentioned in
[MESOS-7742](https://issues.apache.org/jira/browse/MESOS-7742).
The solution is to upgrade Mesos to a version higher or equal to 1.5.1.

## Features

- Web-based container terminal.
- Authentication against LDAP.
- Authorizations based on Mesos labels.
- Permissions delegation.

## Getting started

To set up a complete environment for testing, ensure docker and docker-compose
are installed on your machine and run:

```
./scripts/build.sh
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

WARNING: Make sure that access to the api/v1 endpoint of your Mesos cluster
is authenticated by using the flag `--authenticate_http_readwrite`. Indeed, not
doing so could open serious security breaches and lead to privilege escalations.

### Without authorizations

In order to use MesosTerm without authorizations, execute the following
command:

```
docker run --name mesos-term --rm -p 3000:3000 -it \
  -e MESOS_TERM_JWT_SECRET=your-jwt-secret \
  -e MESOS_TERM_MESOS_MASTER_URL=http://mesos-master:5050 \
  -e MESOS_TERM_MESOS_STATE_CACHE_TIME=60 \
  -e MESOS_TERM_NODE_ENV=production \
  -e MESOS_TERM_SESSION_SECRET=your-session-secret \
  clems4ever/mesos-term
```

### With authorizations

In order to use MesosTerm with authorizations, execute the following
command:

```
docker run --name mesos-term --rm -p 3000:3000 -it \
  -e MESOS_TERM_ENABLE_PER_APP_ADMINS=true \
  -e MESOS_TERM_ENABLE_RIGHTS_DELEGATION=true \
  -e MESOS_TERM_JWT_SECRET=your-jwt-secret \
  -e MESOS_TERM_LDAP_BASE_DN=dc=yourldap,dc=com \
  -e MESOS_TERM_LDAP_PASSWORD=the-admin-password \
  -e MESOS_TERM_LDAP_URL=ldap://yourldap.com \
  -e MESOS_TERM_LDAP_USER=cn=admin,dc=yourldap,dc=com \
  -e MESOS_TERM_MESOS_MASTER_URL=http://mesos-master:5050 \
  -e MESOS_TERM_MESOS_STATE_CACHE_TIME=60 \
  -e MESOS_TERM_NODE_ENV=production \
  -e MESOS_TERM_SESSION_SECRET=your-session-secret \
  -e MESOS_TERM_SUPER_ADMINS=admins,harry \
  clems4ever/mesos-term
```

### Connect to Mesos over https

In order to connect to Mesos over https, you need to provide the certificate that
MesosTerm should trust using the MESOS_TERM_CA_FILE environment variable.

```
docker run --name mesos-term --rm -p 3000:3000 -it \
  -v /path/to/my-ca.pem:/ca.pem \
  -e NODE_ENV=production \
  -e MESOS_TERM_CA_FILE=/ca.pem \
  -e MESOS_TERM_JWT_SECRET=your-jwt-secret \
  -e MESOS_TERM_MESOS_MASTER_URL=https://mesos-master:5050 \
  -e MESOS_TERM_MESOS_STATE_CACHE_TIME=60 \
  -e MESOS_TERM_SESSION_SECRET=your-session-secret \
  clems4ever/mesos-term
```

### Connect to an authenticated Mesos

In order to spawn a terminal, MesosTerm needs to query the api/v1 endpoint of Mesos.
For security reasons, this endpoint should ALWAYS be authenticated. You can use
MESOS_TERM_MESOS_AGENT_PRINCIPAL and MESOS_TERM_MESOS_AGENT_PASSWORD to make MesosTerm
authenticate against the Mesos agent in order to run a terminal.

For instance,

```
docker run --name mesos-term --rm -p 3000:3000 -it \
  -e NODE_ENV=production \
  -e MESOS_TERM_JWT_SECRET=your-jwt-secret \
  -e MESOS_TERM_MESOS_MASTER_URL=https://mesos-master:5050 \
  -e MESOS_TERM_MESOS_STATE_CACHE_TIME=60 \
  -e MESOS_TERM_SESSION_SECRET=your-session-secret \
  -e MESOS_TERM_MESOS_AGENT_PRINCIPAL=mesosterm \
  -e MESOS_TERM_MESOS_AGENT_PASSWORD=the_password \
  clems4ever/mesos-term
```

## Option details

Here are the details of available options.

| Parameter                           | Description                                                                                                                                                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MESOS_TERM_COMMAND                  | The command to be run in the container when a user logs in. (Default: /bin/sh)                                                                                                                                             |
| MESOS_TERM_ENVIRONMENT              | List of environment variable to enrich the shell with (NAME=value, colon separated)                                                                                                                                        |
| MESOS_TERM_ENABLE_PER_APP_ADMINS    | If 'true', application administrators can be declared with the Mesos label MESOS_TERM_DEBUG_GRANTED_TO label. It means those users can log into the application containers. An example is provided below. (Default: false) |
| MESOS_TERM_ALLOWED_TASK_ADMINS      | White list of application administrators (users or groups) allowed to override application configuration through Mesos label                                                                                               |
| MESOS_TERM_ENABLE_RIGHTS_DELEGATION | If 'true', super administrators can delegate rights to log into one specific container to one person for a certain amount of time. (Default: false)                                                                        |
| MESOS_TERM_JWT_SECRET               | Secret used to generate and validate JWT tokens.                                                                                                                                                                           |
| MESOS_TERM_LDAP_BASE_DN             | Base distinguished name from which to search users for authentication.                                                                                                                                                     |
| MESOS_TERM_LDAP_PASSWORD            | Password of the LDAP user to bind against LDAP server.                                                                                                                                                                     |
| MESOS_TERM_LDAP_URL                 | Url of the LDAP server. Authorizations are disabled if this env variable is not set.                                                                                                                                       |
| MESOS_TERM_LDAP_USER                | User DN of the LDAP user to bind against LDAP server.                                                                                                                                                                      |
| MESOS_TERM_MESOS_MASTER_URL         | Url of the Mesos master to fetch the state from.                                                                                                                                                                           |
| MESOS_TERM_MESOS_STATE_CACHE_TIME   | Time in seconds before invalidating the cache containing Mesos state.                                                                                                                                                      |
| MESOS_TERM_NODE_ENV                 | Must be "production" for express to run in production mode.                                                                                                                                                                |
| MESOS_TERM_SESSION_SECRET           | Secret used to encrypt session cookie.                                                                                                                                                                                     |
| MESOS_TERM_SESSION_MAX_AGE_SEC      | The session cookie will expire after this amount of time. (default: 3h)                                                                                                                                                    |
| MESOS_TERM_SUPER_ADMINS             | Comma-separated list of LDAP users and groups having all rights on all containers.                                                                                                                                         |
| MESOS_TERM_CA_FILE                  | CA file to connect to Mesos agent in pem format.                                                                                                                                                                           |
| MESOS_TERM_MESOS_AGENT_PRINCIPAL    | The principal Mesos term uses to connect to the Mesos agent.                                                                                                                                                               |
| MESOS_TERM_MESOS_AGENT_PASSWORD     | The password Mesos term uses to connect to the Mesos agent.                                                                                                                                                                |
| MESOS_TERM_AUTHORIZE_ALL_SANDBOXES  | If `true`, all authenticated users can read all sandboxes. Otherwise the permissions are granted according to the same strategy as for terminals                                                                           |

## Authorizations model

**MesosTerm** support a two-level authorization model allowing certain users
to be super administrator, meaning users able to debug any container in Mesos,
and other users considered as application administrators who can only debug
their own applications.

### Super administrators

Super administrators must be mentionned in the MESOS_TERM_SUPER_ADMINS
environment as a comma-separated list of LDAP users and/or groups. They have
full permissions in MesosTerm, i.e., they are able to debug any container
be it root or not. They are also able to produce access tokens to delegate
rights to log into a container.

### Application administrators

Application administrators are able to debug their own applications and
therefore they must be mentionned as a comma-separated list of LDAP users
and groups in the MESOS_TERM_DEBUG_GRANTED_TO task labels. Here is an
example using Marathon.

![authorized users](doc/images/authorizations.png?raw=true "Authorizations")

If needed, an optional layer of security can be added by using the MESOS_TERM_ALLOWED_TASK_ADMINS
parameter. This is a comma-separated whitelist of users/groups allowed to use the
MESOS_TERM_DEBUG_GRANTED_TO label in their Mesos applications. If empty, all users/groups
are allowed to use the label.

For security reasons, it has been decided to not allow administrators of an application
to log in a container in the case the Mesos task runs as `root` or no user
(meaning the user running Mesos, i.e., most probably `root`). Only super
administrators can debug those containers.

### Permissions delegation

In some cases, super administrators might want to allow access to a
specific container to a user for a certain amount of time. This is possible
in MesosTerm by producing an access token and giving it to the delegated user.
He will then be able to access this specific container for the time provided.

The access delegation is only available to super admins via the button called
`Grant access` in the UI or via the endpoint /delegate.

![access delegation](doc/images/grant-access.png?raw=true "Access Delegation")

## Mesos state caching

For huge production Mesos clusters, it might be slow to retrieve the Mesos state
and get the task information in order to verify the permissions of a user
to log into a container. In order to improve the user experience,
the Mesos state is fetched regularly and cached. The cache is invalidated
after some time defined by the environment variable called
MESOS_TERM_MESOS_STATE_CACHE_TIME and expressed in seconds.

You can set a big number in order to reduce the load of your Mesos cluster.
Though, it is important to know that **MesosTerm** automatically invalidate
the cache when a terminal is requested for a task that does not exist in
the cache. It allows users to log into newly created instances that
might not be yet in the cache.

## Contributing

MesosTerm uses hot-reloading to let you develop and test easily. In order
to spawn a complete environment please follow the steps:

    $ # Prepare the environment
    $ source bootstrap.sh

    $ # Run the suite called "standard"
    $ ./tests/resources/setup.sh standard

A suite represents a complete environment for a given configuration of
MesosTerm. For instance, in a given configuration, authorization module
could be enabled while disabled in another configuration.

The list of available suite is:

- noadmin / task admins are disabled, only super admins can have access to containers.
- noauth / authentication and authorization is completely disabled.
- standard / authentication and authorization is enabled with standard features.
- taskadmins / task admins are enabled to restrict the set of administrators of tasks (see MESOS_TERM_ALLOWED_TASK_ADMINS above).

You can then run the corresponding set of tests once you're happy with you changes with

    $ ./tests/resources/run_tests standard

Enjoy!

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

[mit license]: https://opensource.org/licenses/MIT
