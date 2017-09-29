'use strict';

const fetch = require('node-fetch');

const throttle = require('promise-ratelimit')(5000);

const fs = require('fs');

let seen = JSON.parse(fs.readFileSync('seen.json', 'utf8'));

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
};

let counter = 0;

let get_genes = function(article) {
  return throttle()
  .then( () => counter++ && console.log(counter) )
  .then( () => seen.push(article.pmid) )
  .then( () => fs.writeFileSync('seen.json',JSON.stringify(seen)) )
  .then( () => fetch(`https://www.ncbi.nlm.nih.gov/CBBresearch/Lu/Demo/RESTful/tmTool.cgi/Gene/${article.pmid}/JSON/`))
  .then( res => res.json() )
  .then( res => res.denotations.map( not => not.obj ).filter(onlyUnique) )
  .then( genes => {
    article.genes = genes;
    return article;
  })
};

let print_article = function(article) {
  if (article.genes.length < 1) {
    return;
  }
  console.log(article.pmid,article.score,article.cited_by_tweeters_count,article.title, new Date(article.added_on*1000),article.cohorts,article.genes);  
};

fetch('https://api.altmetric.com/v1/citations/2d?cited_in=twitter&order_by=first_seen&num_results=100&page=2')
    .then(res => {
        return res.json();
    }).then( json => {
        return json.results.filter( res => {
          return res.pmid && (seen.indexOf(res.pmid) < 0) && (res.cited_by_tweeters_count >= 2);
        });
    }).then( with_pmids => {
      console.log("Total with PMIDS",with_pmids.length);
      let mapped = with_pmids.map( article => get_genes(article).then(print_article) ).reduce((prev, cur) => prev.then(cur), Promise.resolve());
      return mapped;
    });

    // curl ''