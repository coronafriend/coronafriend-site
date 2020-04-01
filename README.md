# <img valign="top" src="https://github.com/coronafriend/coronafriend-assets/raw/master/site-icons/coronafriend-icon.png" width="64" heigh="64" alt="CoronaFriend">&nbsp;coronafriend-site

CoronaFriend is a lightweight web map application that helps connect people,
communities and existing social network groups to provide on the ground help
and support to people and households who are self isolating during the current
COVID-19 crisis.

## developments

tech used:

-   node
-   sass

frameworks used:

-   bootstrap
-   fontawesome
-   leaflet

Thrird party lib used:

-   leaflet.locatecontrol
-   mapbox-gl for leaflet

### setup

the usual

```
$ npm install
```

### watch task

The watch task builds and keeps watching the file changes.

```
$ npm start && npm run serve
```

it outputs changes into : `dist/coronafriend-site/public`

## build

to build the website use

```
$ npm run build
```

this task builds and outputs the website into : `dist/coronafriend-site/public`
