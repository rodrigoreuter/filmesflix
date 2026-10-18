/*
 * FONTE: Jellyfin
 * Toca a SUA biblioteca de vídeos a partir de um servidor Jellyfin
 * (grátis, roda no seu PC/NAS). https://jellyfin.org
 * Configure em js/config.js > providers.jellyfin
 */
(function () {
  function cfg() { return Fontes.config('jellyfin'); }
  function base() { return cfg().serverUrl.replace(/\/+$/, ''); }

  function call(path, params) {
    params = params || {};
    params.api_key = cfg().apiKey;
    return Http.getJSON(base() + path + Http.qs(params));
  }

  function image(id, type, height) {
    return base() + '/Items/' + id + '/Images/' + type + Http.qs({ maxHeight: height, quality: 90, api_key: cfg().apiKey });
  }

  function duration(ticks) {
    if (!ticks) return '';
    var min = Math.round(ticks / 600000000);
    return min >= 60 ? Math.floor(min / 60) + 'h ' + (min % 60) + 'min' : min + ' min';
  }

  function toItem(r) {
    var isSeries = r.Type === 'Series';
    var title = r.Name;
    if (r.Type === 'Episode') {
      title = 'T' + (r.ParentIndexNumber || 0) + 'E' + (r.IndexNumber || 0) + ' • ' + r.Name;
    }
    var meta = [];
    if (r.ProductionYear) meta.push(r.ProductionYear);
    if (r.RunTimeTicks) meta.push(duration(r.RunTimeTicks));
    if (r.SeriesName && r.Type === 'Episode') meta.push(r.SeriesName);
    var hasPrimary = r.ImageTags && r.ImageTags.Primary;
    var backdropId = (r.BackdropImageTags && r.BackdropImageTags.length) ? r.Id : (r.ParentBackdropItemId || r.SeriesId);
    return {
      id: r.Id,
      title: title,
      image: hasPrimary ? image(r.Id, 'Primary', 400) : '',
      backdrop: backdropId ? image(backdropId, 'Backdrop', 1080) : (hasPrimary ? image(r.Id, 'Primary', 1080) : ''),
      overview: r.Overview || '',
      meta: meta.join(' • '),
      playable: !isSeries,
      hasChildren: isSeries,
      childrenLabel: 'Episódios',
      raw: r
    };
  }

  var FIELDS = 'Overview,ProductionYear,RunTimeTicks';

  Fontes.register({
    id: 'jellyfin',
    name: 'Minha biblioteca',
    setupHint: 'Preencha serverUrl, apiKey e userId do seu Jellyfin em js/config.js (providers.jellyfin).',

    isConfigured: function () {
      var c = cfg();
      return !!(c.serverUrl && c.apiKey && c.userId);
    },

    // Uma fileira "Continuar assistindo" + uma fileira de recentes por biblioteca.
    getRows: function () {
      var uid = cfg().userId;
      var resume = call('/Users/' + uid + '/Items/Resume', { Limit: 20, Fields: FIELDS, MediaTypes: 'Video' })
        .then(function (d) { return { title: 'Continuar assistindo', items: (d.Items || []).map(toItem) }; });

      var libs = call('/Users/' + uid + '/Views').then(function (d) {
        var views = (d.Items || []).filter(function (v) {
          return !v.CollectionType || v.CollectionType === 'movies' || v.CollectionType === 'tvshows' || v.CollectionType === 'homevideos';
        });
        return Promise.all(views.map(function (v) {
          return call('/Users/' + uid + '/Items/Latest', { ParentId: v.Id, Limit: 30, Fields: FIELDS })
            .then(function (items) { return { title: 'Recentes em ' + v.Name, items: (items || []).map(toItem) }; });
        }));
      });

      return Promise.all([resume, libs]).then(function (r) { return [r[0]].concat(r[1]); });
    },

    search: function (q) {
      return call('/Users/' + cfg().userId + '/Items', {
        searchTerm: q, Recursive: true, Limit: 40, Fields: FIELDS,
        IncludeItemTypes: 'Movie,Series,Episode,Video'
      }).then(function (d) { return (d.Items || []).map(toItem); });
    },

    getChildren: function (item) {
      return call('/Shows/' + item.id + '/Episodes', { UserId: cfg().userId, Fields: FIELDS })
        .then(function (d) { return (d.Items || []).map(toItem); });
    },

    // HLS com transcodificação para H.264/AAC: compatível com qualquer TV.
    getStream: function (item) {
      var c = cfg();
      var url = base() + '/Videos/' + item.id + '/master.m3u8' + Http.qs({
        api_key: c.apiKey, MediaSourceId: item.id, DeviceId: 'filmesflix-webos',
        VideoCodec: 'h264', AudioCodec: 'aac,mp3', TranscodingMaxAudioChannels: 2,
        SegmentContainer: 'ts', MaxStreamingBitrate: 40000000
      });
      return Promise.resolve({ type: 'video', url: url });
    }
  });
})();
