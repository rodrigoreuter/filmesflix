/*
 * Pequeno cliente HTTP baseado em XMLHttpRequest + Promise.
 * (fetch() não existe nas TVs com webOS 3.x, por isso o XHR.)
 */
var Http = (function () {
  function request(method, url, options) {
    options = options || {};
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.timeout = options.timeout || 15000;
      var headers = options.headers || {};
      for (var name in headers) {
        if (headers.hasOwnProperty(name)) xhr.setRequestHeader(name, headers[name]);
      }
      xhr.onload = function () {
        // status 0 + conteúdo = arquivo local (file://) dentro do app na TV
        if ((xhr.status >= 200 && xhr.status < 300) || (xhr.status === 0 && xhr.responseText)) {
          resolve(xhr.responseText);
        } else {
          reject(new Error('HTTP ' + xhr.status + ' em ' + url.split('?')[0]));
        }
      };
      xhr.onerror = function () { reject(new Error('Falha de rede ao acessar ' + url.split('?')[0])); };
      xhr.ontimeout = function () { reject(new Error('Tempo esgotado ao acessar ' + url.split('?')[0])); };
      xhr.send(options.body || null);
    });
  }

  function getJSON(url, headers) {
    return request('GET', url, { headers: headers }).then(function (text) {
      return JSON.parse(text);
    });
  }

  // Monta "?a=1&b=2" a partir de um objeto, ignorando valores vazios.
  function qs(params) {
    var parts = [];
    for (var k in params) {
      if (params.hasOwnProperty(k) && params[k] !== undefined && params[k] !== null && params[k] !== '') {
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
      }
    }
    return parts.length ? '?' + parts.join('&') : '';
  }

  return { request: request, getJSON: getJSON, qs: qs };
})();
