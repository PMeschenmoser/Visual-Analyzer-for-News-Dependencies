# VAND #

## Visual Explorer for News Dependencies

### What's VAND?
VAND is a web application for exploring semantic and temporal relations between news articles.
Its backend works with node.js, its frontend's mainly programmed with latest d3 v4.
* User import their own .txt/.json files or select prototypical article sets. The administrator
defines the latter ones within the backend. 
* The visualisation is a force-directed graph, where one dimension encodes 
article timestamps: thus, this dimension is fixed.
* The semantic similarity between two articles is encoded onto link 
width.
* Panning, (semantic) zooming, brushing (focus + context) and details on demand (full-text and score rankings) are applicable. 
* Choose between novice and expert mode: Optimize graph parameters for your specific use case, but only if you want to!
* Much more things are possible, visit our detailed [Feature Overview](https://github.com/fhamborg/semantictemporal-vis/wiki/Feature-Overview) or 
[Frontend Interaction](https://github.com/fhamborg/semantictemporal-vis/wiki/Frontend-Interaction)! 

### SETUP
* Make sure that you have the latest node.js + npm installed.
* Run `npm install` in the project base directory. 
* Run the server via `npm run-script start`
* Open your browser at localhost:3000!
* [More details](https://github.com/fhamborg/semantictemporal-vis/wiki/Setup)

### Wiki Overview
1. [Home](https://github.com/fhamborg/semantictemporal-vis/wiki)
2. [Setup](https://github.com/fhamborg/semantictemporal-vis/wiki/Setup)
3. [Feature Overview](https://github.com/fhamborg/semantictemporal-vis/wiki/Feature-Overview)
4. [Frontend Interaction](https://github.com/fhamborg/semantictemporal-vis/wiki/Frontend-Interaction)
5. For Developers
    1. [Code Conventions](https://github.com/fhamborg/semantictemporal-vis/wiki/Code-Conventions)
    2. [Project Structure](https://github.com/fhamborg/semantictemporal-vis/wiki/Project-Structure)
    3. [Frontend Architecture](https://github.com/fhamborg/semantictemporal-vis/wiki/Frontend-Architecture)
    4. [Frontend Modules](https://github.com/fhamborg/semantictemporal-vis/wiki/Frontend-Modules) 
    5. [Frontend - Backend Dataflow](https://github.com/fhamborg/semantictemporal-vis/wiki/Frontend---Backend-Communcation-(Data-flow))
    6. [Backend Docu](https://github.com/fhamborg/semantictemporal-vis/wiki/Backend)
    7. [Add Article Sets to your Server](https://github.com/fhamborg/semantictemporal-vis/wiki/Add-Article-Sets-to-your-Server)

![outranks](http://i.imgur.com/7XLpF8r.jpg)

