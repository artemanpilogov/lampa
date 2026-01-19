(function() {
  'use strict';

  // Проверка доступности Lampa
  if (typeof Lampa === 'undefined') {
    console.error('Lampa is not defined');
    return;
  }

  var Defined = {
    api: 'kinovibe',
    localhost: 'https://kinovibe.vip/',
    name: 'KinoVibe'
  };

  var balansers_with_search = ['kinovibe'];
  
  var Network = Lampa.Reguest;

  function component(object) {
    var network = new Network();
    var scroll = new Lampa.Scroll({
      mask: true,
      over: true
    });
    var files = new Lampa.Explorer(object);
    var filter = new Lampa.Filter(object);
    var last;
    var initialized;
    var balanser = 'kinovibe';
    var images = [];
    
    var filter_translate = {
      season: Lampa.Lang.translate('torrent_serial_season'),
      voice: Lampa.Lang.translate('torrent_parser_voice')
    };
    
    var filter_find = {
      season: [],
      voice: []
    };

    /**
     * Инициализация
     */
    this.initialize = function() {
      var _this = this;
      
      this.loading(true);
      
      filter.onSearch = function(value) {
        Lampa.Activity.replace({
          search: value,
          clarification: true
        });
      };
      
      filter.onBack = function() {
        _this.start();
      };
      
      filter.render().find('.selector').on('hover:enter', function() {});
      filter.render().find('.filter--search').appendTo(filter.render().find('.torrent-filter'));
      
      filter.onSelect = function(type, a, b) {
        if (type == 'filter') {
          if (a.reset) {
            _this.replaceChoice({
              season: 0,
              voice: 0
            });
            setTimeout(function() {
              Lampa.Select.close();
              Lampa.Activity.replace();
            }, 10);
          } else {
            var choice = _this.getChoice();
            choice[a.stype] = b.index;
            _this.saveChoice(choice);
            _this.reset();
            _this.find();
            setTimeout(Lampa.Select.close, 10);
          }
        }
      };
      
      if (filter.addButtonBack) filter.addButtonBack();
      filter.render().find('.filter--sort').remove();
      
      scroll.body().addClass('torrent-list');
      files.appendFiles(scroll.render());
      files.appendHead(filter.render());
      scroll.minus(files.render().find('.explorer__files-head'));
      scroll.body().append(Lampa.Template.get('lampac_content_loading'));
      
      Lampa.Controller.enable('content');
      this.loading(false);
      this.search();
    };

    /**
     * Создание источника
     */
    this.createSource = function() {
      return Promise.resolve();
    };

    /**
     * Создать компонент
     */
    this.create = function() {
      return this.render();
    };

    /**
     * Начать поиск
     */
    this.search = function() {
      this.find();
    };

      try {
        var search_query = object.search || object.movie.title || object.movie.name;
        var is_serial = object.movie.name ? true : false;
        
        this.loading(true);
        
        // Формируем URL для поиска
        var search_url = Defined.localhost + 'engine/ajax/search.php';
        
        network.silent(search_url, function(html) {
          _this.parseSearch(html, search_query, is_serial);
        }, function(error) {
          console.log('KinoVibe: Search error', error);
          _this.empty();
        }, {
          query: search_query
        }, {
          dataType: 'html',
          timeout: 10000
        });
      } catch(e) {
        console.error('KinoVibe: Find error', e);
        this.empty();
      }this.empty();
      }, {
        query: search_query
      }, {
        dataType: 'html',
        timeout: 10000
      });
    };

    /**
     * Парсинг результатов поиска
     */
    this.parseSearch = function(html, query, is_serial) {
      var _this = this;
      var $html = $(html);
      var results = [];
      
      // Парсим результаты поиска
      $html.find('.searchitem').each(function() {
        var $item = $(this);
        var title = $item.find('.searchitem-title').text().trim();
        var url = $item.find('a').attr('href');
        var year = $item.find('.searchitem-year').text().trim();
        
        if (url) {
          results.push({
            title: title,
            url: Defined.localhost + url.replace(/^\//, ''),
            year: year
          });
        }
      });
      
      // Если найдено несколько результатов, показываем список
      if (results.length > 1) {
        this.similars(results);
      } else if (results.length === 1) {
        // Если один результат, сразу загружаем его
        this.loadMovie(results[0].url);
      } else {
        // Пробуем прямой поиск по URL
        this.directSearch(query, is_serial);
      }
    };

    /**
     * Прямой поиск
     */
    this.directSearch = function(query, is_serial) {
      var _this = this;
      var search_type = is_serial ? 'series' : 'films';
      var search_url = Defined.localhost + search_type + '/';
      
      network.silent(search_url, function(html) {
        _this.parseMainPage(html, query);
      }, function() {
        _this.empty();
      }, false, {
        dataType: 'html'
      });
    };

    /**
     * Парсинг главной страницы
     */
    this.parseMainPage = function(html, query) {
      var _this = this;
      var $html = $(html);
      var results = [];
      
      $html.find('.poster').each(function() {
        var $item = $(this);
        var title = $item.find('.poster-title').text().trim();
        var url = $item.find('a').attr('href');
        
        if (url && title.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
          results.push({
            title: title,
            url: Defined.localhost + url.replace(/^\//, '')
          });
        }
      });
      
      if (results.length === 1) {
        this.loadMovie(results[0].url);
      } else if (results.length > 1) {
        this.similars(results);
      } else {
        this.empty();
      }
    };

    /**
     * Загрузка страницы фильма/сериала
     */
    this.loadMovie = function(url) {
      var _this = this;
      
      network.silent(url, function(html) {
        _this.parseMovie(html);
      }, function() {
        _this.empty();
      }, false, {
        dataType: 'html'
      });
    };

    /**
     * Парсинг страницы фильма
     */
    this.parseMovie = function(html) {
      var _this = this;
      var $html = $(html);
      var videos = [];
      
      // Ищем iframe с плеером
      var $iframe = $html.find('iframe[src*="video"], iframe[src*="player"], iframe[data-src*="video"]');
      
      if ($iframe.length) {
        var iframe_url = $iframe.attr('src') || $iframe.attr('data-src');
        
        // Загружаем содержимое iframe
        network.silent(iframe_url, function(player_html) {
          _this.parsePlayer(player_html);
        }, function() {
          _this.empty();
        }, false, {
          dataType: 'html'
        });
      } else {
        // Пробуем найти прямые ссылки на видео
        this.parseDirectLinks($html);
      }
    };

    /**
     * Парсинг плеера
     */
    this.parsePlayer = function(html) {
      var _this = this;
      var $html = $(html);
      var videos = [];
      
      // Ищем JSON с данными о сезонах/сериях
      var scripts = $html.find('script');
      var playlist_data = null;
      
      scripts.each(function() {
        var script_text = $(this).text();
        
        // Ищем данные плейлиста
        if (script_text.indexOf('pl') !== -1 || script_text.indexOf('playlist') !== -1) {
          try {
            // Пытаемся извлечь JSON
            var json_match = script_text.match(/pl\s*=\s*(\{[\s\S]*?\});/);
            if (json_match) {
              playlist_data = JSON.parse(json_match[1]);
            }
          } catch(e) {}
        }
      });
      
      if (playlist_data) {
        // Обрабатываем данные плейлиста
        this.processPlaylist(playlist_data);
      } else {
        // Если не нашли плейлист, ищем прямые ссылки
        this.parseDirectLinks($html);
      }
    };

    /**
     * Обработка плейлиста
     */
    this.processPlaylist = function(playlist) {
      var _this = this;
      var videos = [];
      
      if (playlist.playlist && Array.isArray(playlist.playlist)) {
        // Сериал с сезонами
        filter_find.season = playlist.playlist.map(function(season, index) {
          return {
            title: season.comment || ('Сезон ' + (index + 1)),
            index: index
          };
        });
        
        var choice = this.getChoice();
        var season_index = choice.season || 0;
        var season = playlist.playlist[season_index];
        
        if (season && season.playlist) {
          season.playlist.forEach(function(episode, ep_index) {
            videos.push({
              title: episode.comment || ('Серия ' + (ep_index + 1)),
              season: season_index + 1,
              episode: ep_index + 1,
              url: episode.file || episode.url,
              method: 'play',
              quality: {}
            });
          });
        }
      } else if (playlist.file || playlist.url) {
        // Фильм
        videos.push({
          title: object.movie.title || object.movie.name,
          url: playlist.file || playlist.url,
          method: 'play',
          quality: {}
        });
      }
      
      if (videos.length) {
        this.display(videos);
      } else {
        this.empty();
      }
    };

    /**
     * Парсинг прямых ссылок
     */
    this.parseDirectLinks = function($html) {
      var videos = [];
      
      // Ищем видео элементы
      $html.find('source, video source').each(function() {
        var src = $(this).attr('src');
        var quality = $(this).attr('label') || $(this).attr('title') || '720p';
        
        if (src) {
          videos.push({
            title: object.movie.title || object.movie.name,
            url: src,
            quality: quality,
            method: 'play'
          });
        }
      });
      
      if (videos.length) {
        this.display(videos);
      } else {
        this.empty();
      }
    };

    /**
     * Показать похожие
     */
    this.similars = function(results) {
      var _this = this;
      
      scroll.clear();
      
      results.forEach(function(item) {
        var element = {
          title: item.title,
          url: item.url,
          info: item.year || ''
        };
        
        var html = Lampa.Template.get('lampac_prestige_folder', element);
        
        html.on('hover:enter', function() {
          _this.reset();
          _this.loadMovie(item.url);
        }).on('hover:focus', function(e) {
          last = e.target;
          scroll.update($(e.target), true);
        });
        
        scroll.append(html);
      });
      
      this.loading(false);
      Lampa.Controller.enable('content');
    };

    /**
     * Отобразить видео
     */
    this.display = function(videos) {
      var _this = this;
      
      if (!videos.length) return this.empty();
      
      this.draw(videos, {
        onEnter: function(item, html) {
          var playlist = [];
          var first = {
            title: item.title,
            url: item.url,
            quality: item.quality,
            season: item.season,
            episode: item.episode
          };
          
          if (item.season) {
            videos.forEach(function(elem) {
              playlist.push({
                title: elem.title,
                url: elem.url,
                quality: elem.quality,
                season: elem.season,
                episode: elem.episode,
                timeline: elem.timeline
              });
            });
          } else {
            playlist.push(first);
          }
          
          if (playlist.length > 1) first.playlist = playlist;
          
          if (first.url) {
            Lampa.Player.play(first);
            if (playlist.length > 1) Lampa.Player.playlist(playlist);
            
            if (object.movie.id) {
              Lampa.Favorite.add('history', object.movie, 100);
            }
          } else {
            Lampa.Noty.show('Не удалось получить ссылку на видео');
          }
        }
      });
      
      this.filter({
        season: filter_find.season.map(function(s) {
          return s.title;
        })
      }, this.getChoice());
    };

    /**
     * Отрисовка
     */
    this.draw = function(items, params) {
      var _this = this;
      
      if (!items.length) return this.empty();
      
      scroll.clear();
      
      var viewed = Lampa.Storage.cache('online_view', 5000, []);
      var choice = this.getChoice();
      
      items.forEach(function(element, index) {
        var hash_timeline = Lampa.Utils.hash(
          element.season ? 
          [element.season, element.episode, object.movie.original_title].join('') :
          object.movie.original_title
        );
        
        var hash_behold = Lampa.Utils.hash(
          element.season ?
          [element.season, element.episode, object.movie.original_title, 'kinovibe'].join('') :
          object.movie.original_title + 'kinovibe'
        );
        
        element.timeline = Lampa.Timeline.view(hash_timeline);
        element.title = element.title || ('Серия ' + (index + 1));
        element.info = element.quality || '';
        element.quality = '';
        
        var html = Lampa.Template.get('lampac_prestige_full', element);
        var image = html.find('.online-prestige__img');
        var loader = html.find('.online-prestige__loader');
        
        if (element.season) {
          image.append('<div class="online-prestige__episode-number">' + 
            ('0' + element.episode).slice(-2) + '</div>');
          loader.remove();
        } else {
          loader.remove();
        }
        
        html.find('.online-prestige__timeline').append(
          Lampa.Timeline.render(element.timeline)
        );
        
        if (viewed.indexOf(hash_behold) !== -1) {
          html.find('.online-prestige__img').append(
            '<div class="online-prestige__viewed">' + 
            Lampa.Template.get('icon_viewed', {}, true) + '</div>'
          );
        }
        
        element.mark = function() {
          viewed = Lampa.Storage.cache('online_view', 5000, []);
          if (viewed.indexOf(hash_behold) == -1) {
            viewed.push(hash_behold);
            Lampa.Storage.set('online_view', viewed);
          }
        };
        
        html.on('hover:enter', function() {
          if (object.movie.id) {
            Lampa.Favorite.add('history', object.movie, 100);
          }
          if (params.onEnter) params.onEnter(element, html);
        }).on('hover:focus', function(e) {
          last = e.target;
          scroll.update($(e.target), true);
        });
        
        scroll.append(html);
      });
      
      this.loading(false);
      Lampa.Controller.enable('content');
    };

    /**
     * Фильтр
     */
    this.filter = function(filter_items, choice) {
      var _this = this;
      var select = [];
      
      select.push({
        title: 'Сбросить фильтр',
        reset: true
      });
      
      if (filter_items.season && filter_items.season.length) {
        var items = filter_items.season;
        var subitems = [];
        
        items.forEach(function(name, i) {
          subitems.push({
            title: name,
            selected: choice.season == i,
            index: i
          });
        });
        
        select.push({
          title: filter_translate.season,
          subtitle: items[choice.season],
          items: subitems,
          stype: 'season'
        });
      }
      
      filter.set('filter', select);
      this.selected(filter_items);
    };

    /**
     * Выбранное в фильтре
     */
    this.selected = function(filter_items) {
      var need = this.getChoice();
      var select = [];
      
      if (filter_items.season && filter_items.season.length >= 1) {
        select.push(filter_translate.season + ': ' + filter_items.season[need.season]);
      }
      
      filter.chosen('filter', select);
    };

    /**
     * Получить выбор
     */
    this.getChoice = function() {
      var data = Lampa.Storage.cache('online_choice_kinovibe', 3000, {});
      var save = data[object.movie.id] || {};
      
      Lampa.Arrays.extend(save, {
        season: 0,
        episodes_view: {},
        movie_view: ''
      });
      
      return save;
    };

    /**
     * Сохранить выбор
     */
    this.saveChoice = function(choice) {
      var data = Lampa.Storage.cache('online_choice_kinovibe', 3000, {});
      data[object.movie.id] = choice;
      Lampa.Storage.set('online_choice_kinovibe', data);
    };

    /**
     * Заменить выбор
     */
    this.replaceChoice = function(choice) {
      var to = this.getChoice();
      Lampa.Arrays.extend(to, choice, true);
      this.saveChoice(to);
    };

    /**
     * Очистка изображений
     */
    this.clearImages = function() {
      images.forEach(function(img) {
        img.onerror = function() {};
        img.onload = function() {};
        img.src = '';
      });
      images = [];
    };

    /**
     * Сброс
     */
    this.reset = function() {
      last = false;
      network.clear();
      this.clearImages();
      scroll.render().find('.empty').remove();
      scroll.clear();
      scroll.reset();
      scroll.body().append(Lampa.Template.get('lampac_content_loading'));
    };

    /**
     * Загрузка
     */
    this.loading = function(status) {
      if (status) this.activity.loader(true);
      else {
        this.activity.loader(false);
        this.activity.toggle();
      }
    };

    /**
     * Пусто
     */
    this.empty = function() {
      var html = Lampa.Template.get('lampac_does_not_answer', {});
      html.find('.online-empty__buttons').remove();
      html.find('.online-empty__title').text('Ничего не найдено');
      html.find('.online-empty__time').text('Попробуйте изменить запрос или проверьте правильность названия');
      scroll.clear();
      scroll.append(html);
      this.loading(false);
    };

    /**
     * Начать
     */
    this.start = function() {
      if (Lampa.Activity.active().activity !== this.activity) return;
      
      if (!initialized) {
        initialized = true;
        this.initialize();
      }
      
      Lampa.Background.immediately(
        Lampa.Utils.cardImgBackgroundBlur(object.movie)
      );
      
      Lampa.Controller.add('content', {
        toggle: function() {
          Lampa.Controller.collectionSet(scroll.render(), files.render());
          Lampa.Controller.collectionFocus(last || false, scroll.render());
        },
        up: function() {
          if (Navigator.canmove('up')) {
            Navigator.move('up');
          } else Lampa.Controller.toggle('head');
        },
        down: function() {
          Navigator.move('down');
        },
        right: function() {
          if (Navigator.canmove('right')) Navigator.move('right');
          else filter.show('Фильтр', 'filter');
        },
        left: function() {
          if (Navigator.canmove('left')) Navigator.move('left');
          else Lampa.Controller.toggle('menu');
        },
        back: this.back.bind(this)
      });
      
      Lampa.Controller.toggle('content');
    };

    this.render = function() {
      return files.render();
    };

    this.back = function() {
      Lampa.Activity.backward();
    };

    this.pause = function() {};
    this.stop = function() {};
    
    this.destroy = function() {
      network.clear();
      this.clearImages();
      files.destroy();
      scroll.destroy();
    try {
      window.kinovibe_plugin = true;
      
      var manifest = {
        type: 'video',
        version: '1.0.1',
        name: 'KinoVibe',
        description: 'Плагин для просмотра онлайн фильмов и сериалов с KinoVibe.vip',
        component: 'kinovibe',
        onContextMenu: function(object) {
          return {
            name: 'Смотреть на KinoVibe',
            description: ''
          };
        },
        onContextLauch: function(object) {
          try {
            resetTemplates();
            Lampa.Component.add('kinovibe', component);
            
            Lampa.Activity.push({
              url: '',
              title: 'KinoVibe - Онлайн просмотр',
              component: 'kinovibe',
              search: object.title || object.name,
              search_one: object.title,
              search_two: object.original_title,
              movie: object,
              page: 1
            });
          } catch(e) {
            console.error('KinoVibe: Launch error', e);
            Lampa.Noty.show('Ошибка запуска KinoVibe: ' + e.message);
          }
        }
      };
      
            search_two: object.original_title,
          movie: object,
          page: 1
      // Добавляем переводы
      Lampa.Lang.add({
        kinovibe_watch: {
          ru: 'Смотреть на KinoVibe',
          en: 'Watch on KinoVibe',
          uk: 'Дивитися на KinoVibe'
        }
      });
    } catch(e) {
      console.error('KinoVibe: Plugin initialization error', e);
    }
  }pa.Lang.add({
      kinovibe_watch: {
        ru: 'Смотреть на KinoVibe',
        en: 'Watch on KinoVibe',
        uk: 'Дивитися на KinoVibe'
      }
    });

    // Добавляем CSS стили
    Lampa.Template.add('kinovibe_css', `
      <style>
        .online-prestige{position:relative;border-radius:.3em;background-color:rgba(0,0,0,0.3);display:flex}
        .online-prestige__body{padding:1.2em;line-height:1.3;flex-grow:1;position:relative}
        .online-prestige__img{position:relative;width:13em;flex-shrink:0;min-height:8.2em}
        .online-prestige__img>img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;border-radius:.3em;opacity:0;transition:opacity .3s}
        .online-prestige__img--loaded>img{opacity:1}
        .online-prestige__folder{padding:1em;flex-shrink:0}
        .online-prestige__folder>svg{width:4.4em !important;height:4.4em !important}
        .online-prestige__viewed{position:absolute;top:1em;left:1em;background:rgba(0,0,0,0.45);border-radius:100%;padding:.25em;font-size:.76em}
        .online-prestige__viewed>svg{width:1.5em !important;height:1.5em !important}
        .online-prestige__episode-number{position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;font-size:2em}
        .online-prestige__loader{position:absolute;top:50%;left:50%;width:2em;height:2em;margin-left:-1em;margin-top:-1em;background:url(./img/loader.svg) no-repeat center center;background-size:contain}
        .online-prestige__head,.online-prestige__footer{display:flex;justify-content:space-between;align-items:center}
        .online-prestige__timeline{margin:.8em 0}
        .online-prestige__timeline>.time-line{display:block !important}
        .online-prestige__title{font-size:1.7em;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical}
        .online-prestige__info{display:flex;align-items:center}
        .online-prestige__quality{padding-left:1em;white-space:nowrap}
        .online-prestige.focus::after{content:'';position:absolute;top:-.6em;left:-.6em;right:-.6em;bottom:-.6em;border-radius:.7em;border:solid .3em #fff;z-index:-1}
        .online-prestige+.online-prestige{margin-top:1.5em}
        .online-empty{line-height:1.4}
        .online-empty__title{font-size:1.8em;margin-bottom:.3em}
        .online-empty__time{font-size:1.2em;font-weight:300;margin-bottom:1.6em}
      </style>
    `);
    
    $('body').append(Lampa.Template.get('kinovibe_css', {}, true));

    function resetTemplates() {
      Lampa.Template.add('lampac_prestige_full', `
        <div class="online-prestige online-prestige--full selector">
          <div class="online-prestige__img">
            <img alt="">
            <div class="online-prestige__loader"></div>
          </div>
          <div class="online-prestige__body">
            <div class="online-prestige__head">
              <div class="online-prestige__title">{title}</div>
              <div class="online-prestige__time">{time}</div>
            </div>
            <div class="online-prestige__timeline"></div>
            <div class="online-prestige__footer">
              <div class="online-prestige__info">{info}</div>
              <div class="online-prestige__quality">{quality}</div>
            </div>
          </div>
        </div>
      `);
      
      Lampa.Template.add('lampac_content_loading', `
        <div class="online-empty">
          <div class="broadcast__scan"><div></div></div>
          <div class="online-empty__templates">
            <div class="online-empty-template selector">
              <div class="online-empty-template__ico"></div>
              <div class="online-empty-template__body"></div>
            </div>
          </div>
        </div>
      `);
      
      Lampa.Template.add('lampac_does_not_answer', `
        <div class="online-empty">
          <div class="online-empty__title"></div>
          <div class="online-empty__time"></div>
        </div>
      `);
      
      Lampa.Template.add('lampac_prestige_folder', `
        <div class="online-prestige online-prestige--folder selector">
          <div class="online-prestige__folder">
            <svg viewBox="0 0 128 112" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect y="20" width="128" height="92" rx="13" fill="white"></rect>
              <path d="M29.9963 8H98.0037C96.0446 3.3021 91.4079 0 86 0H42C36.5921 0 31.9555 3.3021 29.9963 8Z" fill="white" fill-opacity="0.23"></path>
              <rect x="11" y="8" width="106" height="76" rx="13" fill="white" fill-opacity="0.51"></rect>
            </svg>
          </div>
          <div class="online-prestige__body">
            <div class="online-prestige__head">
              <div class="online-prestige__title">{title}</div>
            </div>
            <div class="online-prestige__footer">
              <div class="online-prestige__info">{info}</div>
            </div>
          </div>
        </div>
      `);
    }

    // Кнопка в карточке
    var button = `
      <div class="full-start__button selector view--kinovibe" data-subtitle="${manifest.name} v${manifest.version}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
        </svg>
        <span>Смотреть на KinoVibe</span>
      </div>
    `;

    Lampa.Component.add('kinovibe', component);
    resetTemplates();

    function addButton(e) {
      if (e.render.find('.view--kinovibe').length) return;
      
      var btn = $(button);
      
      btn.on('hover:enter', function() {
        resetTemplates();
        Lampa.Component.add('kinovibe', component);
        
        Lampa.Activity.push({
          url: '',
          title: 'KinoVibe - Онлайн просмотр',
          component: 'kinovibe',
          search: e.movie.title || e.movie.name,
          search_one: e.movie.title,
          search_two: e.movie.original_title,
          movie: e.movie,
          page: 1
        });
      });
      
      e.render.after(btn);
    }

    Lampa.Listener.follow('full', function(e) {
      if (e.type == 'complite') {
        addButton({
          render: e.object.activity.render().find('.view--torrent'),
          movie: e.data.movie
      // Синхронизация хранилища
      if (Lampa.Manifest.app_digital >= 177) {
        Lampa.Storage.sync('online_choice_kinovibe', 'object_object');
      }
    } catch(e) {
      console.error('KinoVibe: Plugin initialization error', e);
    }
  }

  if (!window.kinovibe_plugin) {
    try {
      startPlugin();
      console.log('KinoVibe plugin v1.0.1 loaded successfully');
    } catch(e) {
      console.error('KinoVibe: Failed to start plugin', e);
    }
  }ibe', 'object_object');
    }
  }

  if (!window.kinovibe_plugin) startPlugin();

})();
