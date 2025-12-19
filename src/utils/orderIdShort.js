// src/utils/orderIdShort.js
function orderIdShort(id) {
  return typeof id === 'string' ? id.slice(-6).toUpperCase() : id.toString().slice(-6).toUpperCase();
}

module.exports = orderIdShort;