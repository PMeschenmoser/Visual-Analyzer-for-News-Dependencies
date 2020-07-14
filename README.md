# VAND - Multi

## Visual Explorer for News Dependencies - Multi

### What's VAND Multi?
VAND is a web application for segment-based detection and visualisation of information reuse between
news articles. Please also see the graph-based application on the "graph" branch. VAND is intended as research-oriented application with the goal of matching parameter evaluation
and optimization. Its backend works with node.js, its frontend is mainly programmed with d3 v4.
 
 ![welcome](https://i.imgur.com/F40RQK8.jpg)
 
 

* Users import their own .txt/.json files or select prototypical article sets. The administrator
defines the latter ones within the backend. 
* An own segment matching algorithm is implemented. 
* The visualisation provides in its main view a 1:n article comparison. For a chosen main article, full-text is provided and in case of matches they are highlighted. Segments are connected to compressed reference articles, which are ordered according to the publication timestamp. 
* 1:1 article comparison enables a more in-depth analysis. 
* Small multiples with permutation matrices (c.f. figure below) and powerful hovering scheme make a fast understanding possible.
* Panning, zooming and focus + context ensure scalability. 
* Much more things are applicable, visit our detailed [Feature Overview](https://github.com/PMeschenmoser/Visual-Analyzer-for-News-Dependencies/wiki/VAND-Multi:-Feature-Overview) or 
[Frontend Interaction](https://github.com/PMeschenmoser/Visual-Analyzer-for-News-Dependencies/wiki/VAND-Multi:-Frontend-Interaction)! 
* ...or have a look at [our beautiful demo slides](https://github.com/PMeschenmoser/Visual-Analyzer-for-News-Dependencies/blob/master/_wikidata/demo.pdf)! 

![matrices](https://i.imgur.com/gYILp4m.png)

### How to cite VAND (Graph):
Hamborg, F., Meschenmoser, P., Schubotz, M., & Gipp, B. (2019). NewsDeps: Visualizing the Origin of Information in News Articles. arXiv preprint arXiv:1909.10266.

### SETUP
* Make sure that you have the latest node.js + npm installed.
* Run `npm install` in the project base directory. 
* Run the server via `npm run-script start`
* Run the Stanford Core NLP Server on localhost:9000 (default port).
* Open your browser at localhost:3000!
* [More details](https://github.com/fhamborg/semantictemporal-vis/wiki/Setup)

### Wiki Overview
1. [Home](https://github.com/PMeschenmoser/Visual-Analyzer-for-News-Dependencies/wiki/)
2. [Setup](https://github.com/PMeschenmoser/Visual-Analyzer-for-News-Dependencies/wiki/Setup)
3. [Feature Overview](https://github.com/PMeschenmoser/Visual-Analyzer-for-News-Dependencies/wiki/VAND-Multi:-Feature-Overview)
4. [Frontend Interaction](https://github.com/PMeschenmoser/Visual-Analyzer-for-News-Dependencies/wiki/VAND-Multi:-Frontend-Interaction)
5. For Developers
    1. [Code Conventions](https://github.com/PMeschenmoser/Visual-Analyzer-for-News-Dependencies/wiki/Code-Conventions)
    2. [Project Structure](https://github.com/PMeschenmoser/Visual-Analyzer-for-News-Dependencies/wiki/Project-Structure)
    3. [Frontend Architecture](https://github.com/PMeschenmoser/Visual-Analyzer-for-News-Dependencies/wiki/VAND-Multi:-Frontend-Architecture)
    4. [Frontend Modules](https://github.com/PMeschenmoser/Visual-Analyzer-for-News-Dependencies/wiki/VAND-Multi:-Frontend-Modules) 
    5. [Frontend - Backend Dataflow](https://github.com/PMeschenmoser/Visual-Analyzer-for-News-Dependencies/wiki/Frontend---Backend-Communcation-(Data-flow))
    6. [Backend Docu](https://github.com/PMeschenmoser/Visual-Analyzer-for-News-Dependencies/wiki/Backend)
    7. [Add Article Sets to your Server](https://github.com/PMeschenmoser/Visual-Analyzer-for-News-Dependencies/wiki/Add-Article-Sets-to-your-Server)



