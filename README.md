# Mesos Term

Mesos Term allows you to debug your mesos containers (UCR only) from
a web interface. It gives you an interactive terminal attached to any
container in your cluster.

![The interactive web terminal](doc/images/webterminal.jpg?raw=true "Mesos terminal")

## Getting started

If your mesos master is accessible at http://mesos-master:5050 then the 
command to get started is as simple as: 

```
docker run --name mesos-term --rm -p 3000:3000 -it \
-e MESOS_MASTER_URL=http://mesos-master:5050 clems4ever/mesos-term
```

And then visit `http://localhost:3000/<task_id>` where `<task_id>` is the task 
ID of the Mesos task you can find in the Mesos UI.
