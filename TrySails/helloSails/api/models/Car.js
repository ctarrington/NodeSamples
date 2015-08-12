/**
* Car.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    make: {type: 'string'},
    model: {type: 'string'},
    engine: {model: 'engine'},
    owner: {model:'person'},
    options: {collection: 'option', via:'cars', dominant: true }
  }
};

