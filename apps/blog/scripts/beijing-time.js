'use strict';

// Site policy, independent of OS/browser timezone. Never set Moment's global
// timezone: Hexo's Warehouse Moment type serializes its internal _d field.
const moment = require('moment-timezone');
const yaml = require('js-yaml');
const { split } = require('hexo-front-matter');
const ZONE = 'Asia/Shanghai';

// Keep descriptors/getters and custom permalink fields, but never share dates.
function zonedCopy(post) {
  const descriptors = Object.getOwnPropertyDescriptors(post);
  for (const field of ['date', 'updated']) {
    if (post[field]) descriptors[field] = {
      value: moment(post[field]).clone().tz(ZONE), enumerable: true, configurable: true, writable: true
    };
  }
  return Object.create(Object.getPrototypeOf(post), descriptors);
}

// Hexo 8.1.2 prepareFrontMatter supplies UTC YYYY-MM-DD HH:mm:ss to
// scaffolds. Interpret that instant as UTC, then emit a quoted +08:00 value.
hexo.extend.tag.register('site_beijing_time', function() {
  const created = moment.utc(this.date, 'YYYY-MM-DD HH:mm:ss', true);
  if (!created.isValid()) throw new Error('Invalid scaffold creation date');
  return created.tz(ZONE).format('YYYY-MM-DDTHH:mm:ssZ');
});


function explicitDate(value, field, source) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/.test(value)) {
    throw new Error(`${source}: ${field} must be ISO 8601 YYYY-MM-DDTHH:mm:ss+08:00`);
  }
  const parsed = moment.parseZone(value, moment.ISO_8601, true);
  if (!parsed.isValid()) throw new Error(`${source}: invalid ${field}`);
  return parsed.toDate();
}

// Hexo 8.1.2 adjusts all parsed front-matter dates as wall times, even when
// already offset-aware. Restore the original instant from raw YAML BEFORE
// rendering/generators. Always derive from source: cache rebuilds are idempotent.
hexo.extend.filter.register('before_generate', function() {
  if (this.config.timezone !== ZONE) throw new Error(`Site timezone must be ${ZONE}`);
  const updates = [];
  this.model('Post').forEach(post => {
    const header = split(post.raw || '').data;
    const fields = header ? yaml.load(header, { schema: yaml.JSON_SCHEMA }) : {};
    updates.push(post.update({
      date: explicitDate(fields.date, 'date', post.source),
      updated: explicitDate(fields.updated || fields.date, 'updated', post.source)
    }));
  });
  return Promise.all(updates).then(() => this.locals.invalidate());
}, 0);

// Supply a zoned COPY to the core permalink filter (priority 10). Do not mutate
// Warehouse's stored Moment: that would corrupt its serialized _d timestamp.
hexo.extend.filter.register('post_permalink', function(post) {
  if (!post || !post.date) return post;
  return zonedCopy(post);
}, 0);

// Re-register after theme scripts load. Clone dates so formatting never mutates
// the post's Moment (core helpers can otherwise affect later permalink reads).
let archiveWrapped = false;
hexo.extend.filter.register('before_generate', function() {
  // The stock archive generator groups date.year()/month(), not date helpers.
  // Scope zoned copies to its query; never mutate Warehouse's stored Moments.
  if (!archiveWrapped) {
    const original = this.extend.generator.get('archive');
    if (!original) throw new Error('Expected hexo-generator-archive');
    this.extend.generator.register('archive', function(locals) {
      const { Query } = this.model('Post');
      const scoped = Object.create(locals);
      Object.defineProperty(scoped, 'posts', {
        value: new Query(locals.posts.toArray().map(zonedCopy)), enumerable: true
      });
      return original.call(this, scoped);
    });
    archiveWrapped = true;
  }
  function format(value, pattern) {
    return moment(value).clone().tz(ZONE).locale('zh-cn').format(pattern);
  }
  this.extend.helper.register('date', function(value, pattern) {
    return format(value, pattern || this.config.date_format);
  });
  this.extend.helper.register('time', function(value, pattern) {
    return format(value, pattern || this.config.time_format);
  });
  this.extend.helper.register('full_date', function(value, pattern) {
    // Firefly uses this exact pattern only for datetime attributes; preserve
    // seconds and offset instead of emitting an ambiguous minute-only value.
    const outputPattern = pattern === 'YYYY-MM-DD HH:mm' ? 'YYYY-MM-DDTHH:mm:ssZ' : pattern;
    return format(value, outputPattern || 'YYYY-MM-DD HH:mm:ss [UTC+08:00]');
  });
}, 1);
