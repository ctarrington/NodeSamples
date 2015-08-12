/**
* Option.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    name: {type: 'string'},
    type: {type: 'string', enum: ['safety', 'entertainment', 'performance']},
    cars: {collection: 'car', via: 'options'}
  }
};

