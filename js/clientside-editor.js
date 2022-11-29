// line counter 
(function ($) {
   $.countLines = function (ta, options) {
      var defaults = {
         recalculateCharWidth: true,
         charsMode: "random",
         fontAttrs: ["font-family", "font-size", "text-decoration", "font-style", "font-weight"]
      };

      options = $.extend({}, defaults, options);

      var masterCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
      var counter;

      if (!ta.jquery) {
         ta = $(ta);
      }

      var value = ta.val();
      switch (options.charsMode) {
         case "random":
            // Build a random collection of characters
            options.chars = "";
            masterCharacters += ".,?!-+;:'\"";
            for (counter = 1; counter <= 12; counter++) {
               options.chars += masterCharacters[(Math.floor(Math.random() * masterCharacters.length))];
            }
            break;
         case "alpha":
            options.chars = masterCharacters;
            break;
         case "alpha_extended":
            options.chars = masterCharacters + ".,?!-+;:'\"";
            break;
         case "from_ta":
            // Build a random collection of characters from the textarea
            if (value.length < 15) {
               options.chars = masterCharacters;
            } else {
               for (counter = 1; counter <= 15; counter++) {
                  options.chars += value[(Math.floor(Math.random() * value.length))];
               }
            }
            break;
         case "custom":
            // Already defined in options.chars
            break;
      }

      // Decode chars
      if (!$.isArray(options.chars)) {
         options.chars = options.chars.split("");
      }

      // Generate a span after the textarea with a random ID
      var id = "";
      for (counter = 1; counter <= 10; counter++) {
         id += (Math.floor(Math.random() * 10) + 1);
      }

      ta.after("<span id='s" + id + "'></span>");
      var span = $("#s" + id);

      // Hide the span
      span.hide();

      // Apply the font properties of the textarea to the span class
      $.each(options.fontAttrs, function (i, v) {
         span.css(v, ta.css(v));
      });

      // Get the number of lines
      var lines = value.split("\n");
      var linesLen = lines.length;

      var averageWidth;

      // Check if the textarea has a cached version of the average character width
      if (options.recalculateCharWidth || ta.data("average_char") == null) {
         // Get a pretty good estimation of the width of a character in the textarea. To get a better average, add more characters and symbols to this list
         var chars = options.chars;

         var charLen = chars.length;
         var totalWidth = 0;

         $.each(chars, function (i, v) {
            span.text(v);
            totalWidth += span.width();
         });

         // Store average width on textarea
         ta.data("average_char", Math.ceil(totalWidth / charLen));
      }

      averageWidth = ta.data("average_char");

      // We are done with the span, so kill it
      span.remove();

      // Determine missing width (from padding, margins, borders, etc); this is what we will add to each line width
      var missingWidth = (ta.outerWidth() - ta.width()) * 2;

      // Calculate the number of lines that occupy more than one line
      var lineWidth;

      var wrappingLines = 0;
      var wrappingCount = 0;
      var blankLines = 0;

      $.each(lines, function (i, v) {
         // Calculate width of line
         lineWidth = ((v.length + 1) * averageWidth) + missingWidth;
         // Check if the line is wrapped
         if (lineWidth >= ta.outerWidth()) {
            // Calculate number of times the line wraps
            var wrapCount = Math.floor(lineWidth / ta.outerWidth());
            wrappingCount += wrapCount;
            wrappingLines++;
         }

         if ($.trim(v) === "") {
            blankLines++;
         }
      });

      var ret = {};
      ret["actual"] = linesLen;
      ret["wrapped"] = wrappingLines;
      ret["wraps"] = wrappingCount;
      ret["visual"] = linesLen + wrappingCount;
      ret["blank"] = blankLines;

      return ret;
   };
}(jQuery));


'use strict';

let mds_debug = true;
let user_logged_in = false;


/**
 * queryselectors for relevant dom tags
 */
// Main designcard
let qs_mdc = () => document.querySelector('#mds_maindc');
let qs_mdc_uid = () => { return qs_mdc().dataset.mds_dcUid; };
let qs_mdc_pages = () => { return qs_mdc().querySelectorAll('.mds_maindc-page'); };
let qs_mdc_curr_page_num = () => { return parseInt(qs_mdc().dataset.mds_dcCurrPage); };
let qs_mdc_curr_page = () => { return qs_mdc().querySelector('.mds_maindc-page[data-mds_page-num="' + qs_mdc_curr_page_num() + '"]'); };
let qs_mdc_pages_count = () => { return parseInt(qs_mdc_pages().length); };
let qs_mdc_motive_budstikke_url = () => { return qs_mdc().style.background.match(/http[^"]*/)[0]; };

// pagethumbs select nodes
let qs_pts_select = () => { return document.querySelector('#mds_pagethumb-select'); };
let qs_pt_nodes = () => { return qs_pts_select().querySelectorAll('.mds_pt'); };

// popup for user messages
let qs_popup = () => { return document.querySelector('#mds_popup'); };

/**
* 
* @param {string} type - type of message: err, succ, info or warn
* @param {string} msg - the message to show the user 
*/
function popup(type, msg) {
   let popup_cn, i_cn;
   let loader = qs_popup().querySelector('#mds_loader');
   let i = qs_popup().querySelector('i');

   if (type === 'err') {
      popup_cn = 'mds_popup-err';
      i_cn = 'fas fa-times-circle';
   } else if (type === 'succ') {
      popup_cn = 'mds_popup-succ';
      i_cn = 'fas fa-check-circle';
   } else if (type === 'info') {
      popup_cn = 'mds_popup-info';
      i_cn = 'fas fa-info-circle';
   } else if (type === 'warn') {
      popup_cn = 'mds_popup-warn';
      i_cn = 'fas fa-exclamation-triangle';
   } else if (type === 'load') {
      popup_cn = 'mds_popup-load';
      loader.className = ''; // removes classname 'mds_d-none-i' so its visible
      if (!i.classList.contains('mds_d-none-i'))
         i.classList.add('mds_d-none-i');

   } else if (type === 'hide') {
      if (qs_popup().classList.remove('mds_d-block-i'));
      return;
   }

   qs_popup().className = popup_cn;

   if (type !== 'load') {
      i.className = i_cn;
      loader.className = 'mds_d-none-i';
   }

   qs_popup().querySelector('span').textContent = msg;
   if (!qs_popup().classList.contains('mds_d-block-i'))
      qs_popup().classList.add('mds_d-block-i');
}

/**
 * 
 * @param {object} object - the object to encode to query string format
 */
function querystring(object) {
   let qs = '';
   for (const [key, value] of Object.entries(object)) {
      qs += key + '=' + value + '&';
   }
   qs = qs.replace(/.$/gi, ''); // remove last "&" 
   return qs;
}

/**
 * Ajax for for REST-API 
 */
function ajax(op, data, cb) {
   let action, actions = mds_cs_globals.ajax.actions;
   switch (op) {
      case 'delete':
         action = actions.delete_designcard;
         break;
      case 'save':
         action = actions.save_designcard;
         break;
      case 'step2':
         action = actions.register_receiver_to_checkout;
         break;
      case 'register_user':
         action = actions.register_user;
         break;
      case 'update_autosave':
         action = actions.update_autosave;
         break;
   }
   let xhr = new XMLHttpRequest();
   xhr.responseType = 'json';
   xhr.onload = () => {
      if (mds_debug) console.log('ajax action: ', action, ' status: ', xhr.status, ' res: ', xhr.response);
      cb(xhr.status, xhr.response);
   };
   xhr.open("POST", mds_cs_globals.ajax.ajax_url);
   xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
   xhr.send('action=' + action + '&_ajax_nonce=' + mds_cs_globals.ajax.nonce + '&' + data);
}

function rgb2hex(rgb) {
   rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
   function hex(x) {
      return ("0" + parseInt(x).toString(16)).slice(-2);
   }
   return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}

// tabs
let is_mobile = window.innerWidth <= 600;
let is_tablet = window.innerWidth <= 1170;
let tabs = document.querySelectorAll('.mds_tabcontent');
if (is_tablet) {
   tabs.forEach(e => e.classList.remove('mds_d-flex-i', 'mds_d-block-i'));
}
function open_tab(e, tab_id, tab_class, displaytype) {
   console.log('opening tab: ', e, tab_id, tab_class, displaytype);
   let i, tablinks, tabs;
   tabs = document.querySelectorAll(".mds_tabcontent." + tab_class);
   for (i = 0; i < tabs.length; i++) {
      if (tabs[i].id === tab_id) {
         if (is_tablet) {
            tabs[i].classList.toggle(displaytype)
         } else {
            if (!tabs[i].classList.contains(displaytype)) tabs[i].classList.add(displaytype);
         }
      } else {
         tabs[i].classList.remove(displaytype);
      }
   }
   tablinks = document.querySelectorAll(".mds_tablinks");
   for (i = 0; i < tablinks.length; i++) {
      if (tablinks[i].id === tab_id) {
         if (is_tablet) {
            tablinks[i].classList.toggle('mds_tab-active');
         } else {
            if (!tablinks[i].classList.contains('mds_tab-active'))
               tablinks[i].classList.add('mds_tab-active');
         }
      } else {
         tablinks[i].classList.remove('mds_tab-active');
      }
   }
}

let get_default_hylse_motive_url = () => {
   for (i = 0; i < mds_cs_globals.uploaded_motives.length; i++) {
      if (mds_cs_globals.uploaded_motives[i].motive_type === 'hylse')
         return mds_cs_globals.uploaded_motives[i].thumb_url;
   }
}

let get_default_envelope_motive_url = () => {
   for (i = 0; i < mds_cs_globals.uploaded_motives.length; i++) {
      if (mds_cs_globals.uploaded_motives[i].motive_type === 'envelope')
         return mds_cs_globals.uploaded_motives[i].thumb_url;
   }
}

let get_default_budstikke_motive_url = () => {
   for (i = 0; i < mds_cs_globals.uploaded_motives.length; i++) {
      if (mds_cs_globals.uploaded_motives[i].motive_type === 'budstikke')
         return mds_cs_globals.uploaded_motives[i].a5_url;
   }
}

function dc_exists(dc_uid) {
   let dcs = mds_cs_globals.user_designcards;
   if (dcs.length) {
      for (i = 0; i < dcs.length; i++) {
         if (dcs[i].uid === dc_uid) {
            return true;
         }
      }
   }
   return false;
}

function custom_register_user_modal() {
   let form = qs_user_reg_modal().querySelectorAll('input');
}

const default_mdc = () => { return JSON.parse(localStorage.getItem('default_mdc')); }

/**
 * Constrain text so it doesnt force scroll-overflow
 */
function constrain_text_width() {

   let ta = qs_mdc_curr_page().querySelector('textarea');
   let max_h = parseInt(ta.style.maxHeight.match(/\d+/)[0]);

   // debugger;
   if ((ta.scrollHeight > ta.offsetHeight) && ta.scrollHeight < max_h) {
      ta.style.height = ta.scrollHeight + 'px';
   } else {
      ta.scrollTo(0, 0);
      if (ta.offsetHeight > max_h) {
         ta.style.height = max_h + 'px';
      }
      while (ta.scrollHeight > ta.offsetHeight) {
         ta.value = ta.value.substr(0, ta.value.length - 1);
      }
   }
}

/**
 * Moves canvas signature to last page on pagechange unless param to_pagenum is specified, in that case
 * it will move it to that desired page (used on initialization)
 * 
 * @param {string} to_pagenum - if applied, then canvas signature pad is moved to desired pagenumber
 * 
 */
var canvas_sig = document.querySelector("#mds_maindc-can-sig");
var sig_pad = new SignaturePad(canvas_sig.querySelector('canvas'));
let canv = canvas_sig.querySelector('canvas');
canv.addEventListener('touchstart', (e) => {
   if (is_mobile) {
      e.currentTarget.style.background = 'white';
      let scale = (1.2 - (window.screen.width / 570)).toString().substring(2);
      scale = '1.' + scale;
      e.currentTarget.style.transform = 'scale(' + scale + ')';
      e.currentTarget.style.transformOrigin = 'top';
      qs_mdc().querySelector('#mds_can-options').style.marginTop = '65px';
   }
});
canv.addEventListener('touchend', (e) => {
   if (is_mobile) {
      e.currentTarget.style.background = '#ffffff2b';
      e.currentTarget.style.transform = 'unset';
      e.currentTarget.style.transformOrigin = 'unset';
      qs_mdc().querySelector('#mds_can-options').style.marginTop = 'unset';
   }
});

/**
 * 
 * @param {string|int} to_pagenum - moves canvas signature to desired pagenumber, if omitted, the canvas signature is moved to the last page
 */
function move_canvas_sig_to_lastpage(to_pagenum) {
   if (!to_pagenum) to_pagenum = qs_mdc().dataset.mds_dcPages; // last page

   let page_dest = document.querySelector('#mds_maindc .mds_maindc-page[data-mds_page-num="' + to_pagenum + '"]');
   if (!page_dest.querySelector('canvas'))
      page_dest.querySelector('textarea').after(canvas_sig);
}


/**
* canvas signature methods 
*/
function canvas_erase() {
   sig_pad.clear();
}
function canvas_select_color(color) {
   sig_pad.penColor = color;
}
sig_pad.onEnd = () => {
   if (sig_pad.toDataURL().length > 15000) {
      popup('warn', 'Signaturen er for stor. Du må fjerne noe før du kan lagre/sende.');
      console.log('for stor signatur!!');
   }
}

function pagethumb_active(pagenum) {
   if (typeof (pagenum) === 'number') pagenum = pagenum + '';
   qs_pt_nodes().forEach((pt) => {
      if (pt.dataset.mds_ptnum === pagenum) {
         if (!pt.classList.contains('mds_pt-active')) {
            pt.classList.add('mds_pt-active');
         }
      } else {
         if (pt.classList.contains('mds_pt-active')) {
            pt.classList.remove('mds_pt-active');
         }
      }
   });
}

qs_page_num_show = () => { return document.querySelector('#mds_maindc-pagenum-view'); };
/**
 * 
 * @param {string|int} pagenum - can be event of a html node or a literal string
 */
function change_page(pagenum) {

   if (!user_login_check()) return;

   if (typeof (pagenum) !== 'string') pagenum = pagenum + '';
   for (const page of qs_mdc_pages()) {
      if (page.dataset.mds_pageNum === pagenum) {
         if (page.classList.contains('mds_d-none-i')) {
            page.classList.remove('mds_d-none-i');

         }
         if (qs_mdc().dataset.mds_dcCurrPage !== pagenum) {
            qs_mdc().dataset.mds_dcCurrPage = pagenum;
         }
         pagethumb_active(pagenum);

         set_proper_offset_height();
         auto_resize_curr_page_textarea_greeting();
         constrain_text_width();
         qs_page_num_show().textContent = qs_mdc_curr_page_num();

      } else {
         if (!page.classList.contains('mds_d-none-i')) {
            page.classList.add('mds_d-none-i');
         }
      }
   }
   show_or_hide_del_img_btn();
   update_styling_panel_with_curr_page_settings();
}

function update_styling_panel_with_curr_page_settings() {

   // fontsize
   document.querySelectorAll('#mds_select-fontsize option').forEach((opt) => {
      let fontsize = qs_mdc_curr_page().querySelector('textarea').style.fontSize.match(/\d\d/)[0];
      if (opt.value !== fontsize && opt.hasAttribute('selected')) {
         opt.removeAttribute('selected');
         opt.selected = false;
      } else if (opt.value === fontsize) {
         opt.setAttribute('selected', '');
         opt.selected = true;
      }
   });

   // fontface
   document.querySelectorAll('#mds_select-fontface option').forEach((opt) => {
      let fontface = qs_mdc_curr_page().querySelector('textarea').style.fontFamily.toLowerCase();
      if (opt.value !== fontface && opt.hasAttribute('selected')) {
         opt.removeAttribute('selected');
         opt.selected = false;
      } else if (opt.value === fontface) {
         opt.setAttribute('selected', '');
         opt.selected = true;
      }
   });

   // fontcolor
   document.querySelector('#mds_greeting-color').value = rgb2hex(qs_mdc_curr_page().querySelector('textarea').style.color);

}
function add_page() {
   if (!user_login_check()) return;

   if (qs_mdc_pages_count() > 5) {
      popup('err', 'Du kan ikke ha mer enn 6 sider per gratulasjonskort.');
   } else {
      qs_mdc().appendChild(new_page_node(false, true, false, sig_pad.toData())[0]);
      qs_mdc().dataset.mds_dcPages = qs_mdc_pages_count();
      change_page(qs_mdc_pages_count());
   }
}

/**
 * Makes new page node(s)
 * 
 * @param {object} mdc - contstructs pages from mdc's pages - if omitted, new pages nodes are populated with default data
 * @returns {array} page nodes that can be appended to HTML elements
 */
function new_page_node(mdc, make_pagetumb_node = true, remove_old_pagethumb_nodes = false, sig_data = false) {

   if (qs_mdc_pages.length > 5) {
      popup('err', 'Du kan ikke ha mer enn 6 sider per gratulasjonskort.');
      return;
   }

   let page_nodes = [];
   let last_page;
   let pagethumbs_node = document.querySelector('#mds_pagethumb-select');
   let fakemdc = false;

   // make a new fake MDC with default data
   if (!mdc) {
      fakemdc = true;
      mdc = default_mdc();
      delete mdc.send_type; // send type is only relevant for mdc wrapper
   }

   if (remove_old_pagethumb_nodes) {
      qs_pt_nodes().forEach(e => e.remove());
   }

   mdc.pages = parseInt(mdc.pages);

   // nodes must be appended in a specific order
   for (i = 0; i < mdc.pages; i++) {
      let curr_page = mdc['page_' + (i + 1)];
      let page_node = document.createElement('div');

      page_node.dataset.mds_pageNum = (fakemdc) ? qs_mdc_pages_count() + 1 : i + 1;

      page_node.classList.add('mds_maindc-page');

      // hide all pages except first page so the user starts with the most relevant page
      if (i + 1 !== 1)
         page_node.classList.add('mds_d-none-i');



      // greeting processing
      let greeting_node_ta = document.createElement('textarea');

      greeting_node_ta.classList.add(curr_page.greeting.style.width);
      greeting_node_ta.classList.add('mds_maindc-greeting_text');
      greeting_node_ta.value = curr_page.greeting.content;
      greeting_node_ta.style.fontFamily = curr_page.greeting.style.fontfamily;
      greeting_node_ta.style.fontWeight = curr_page.greeting.style.fontweight;
      greeting_node_ta.style.fontStyle = curr_page.greeting.style.fontstyle;
      greeting_node_ta.style.color = curr_page.greeting.style.fontcolor;
      greeting_node_ta.style.fontSize = curr_page.greeting.style.fontsize;
      greeting_node_ta.style.height = curr_page.greeting_height + 'px';
      greeting_node_ta.dataset.mds_offsetHY = curr_page.greeting_height;


      greeting_node_ta.onkeydown = constrain_text_width;

      // store Y offset for elements that change in Y position relative to the resizeable textarea box for later PDF construction
      new ResizeObserver((entries) => {

         if (page_node.classList.contains('mds_d-none-i')) return;

         greeting_node_ta.dataset.mds_offsetHY = greeting_node_ta.offsetHeight;

         let img = page_node.querySelector('img');
         if (img) {
            img.dataset.mds_offsetY = img.offsetTop;
         }

         let canv_div_container = page_node.querySelector('#mds_maindc-can-sig');
         if (canv_div_container) {
            canv_div_container.dataset.mds_offsetY = canv_div_container.offsetTop;
         }

      }).observe(greeting_node_ta);

      page_node.appendChild(greeting_node_ta);
      // end of greeting processing



      // Canvas signature processing
      let last_iteration = false;
      if (i === mdc.pages - 1) {
         if (sig_data) {
            sig_pad.fromData(sig_data);
         } else if (curr_page.canvas_signature.length > 0) {
            sig_pad.fromData(curr_page.canvas_signature);
         } else {
            sig_pad.clear();
         }

         last_page = i + 1;
         last_iteration = true;
         canvas_sig.dataset.mds_offsetY = curr_page.offset_y_canvas_sig;
         page_node.appendChild(canvas_sig);
      }
      // end of canvas signature processing



      // content image processing 
      if (curr_page.content_img_url) {
         let img_node = document.createElement('img');
         img_node.className = 'mds_maindc-content-image';
         img_node.src = curr_page.content_img_url;
         img_node.dataset.mds_offsetY = curr_page.offset_y_content_img;
         page_node.appendChild(img_node);
         // end of image processing
      }


      if (make_pagetumb_node) {
         // creates index nodes 
         let pt_select_node = document.createElement('div');
         pt_select_node.classList.add('mds_pt');
         let ptnum = (fakemdc) ? qs_mdc_pages_count() + 1 : i + 1;
         pt_select_node.dataset.mds_ptnum = ptnum;
         pt_select_node.textContent = ptnum;
         pt_select_node.onclick = (e) => {
            change_page(e.currentTarget.dataset.mds_ptnum);
         }
         pagethumbs_node.appendChild(pt_select_node);
      }


      page_nodes.push(page_node); // done, now push new node in node array
   }

   return page_nodes;
}

function show_or_hide_del_img_btn() {
   let img_del_btn = document.querySelector('#mds_del-img-btn');
   let cp_has_img = qs_mdc_curr_page().querySelector('img');
   if (!cp_has_img) {
      img_del_btn.className = 'mds_d-none-i';
   } else {
      img_del_btn.className = '';
   }
}

function add_img_node_to_curr_page(src) {
   // content image processing 
   let img_node = document.createElement('img');
   img_node.className = 'mds_maindc-content-image';
   img_node.src = src;
   qs_mdc_curr_page().appendChild(img_node);

   img_node.dataset.mds_offsetY = qs_mdc_curr_page().offset_y_content_img;

   show_or_hide_del_img_btn();
}

let get_page_specific_ta_width_classname = (page) => {
   let ta = page.querySelector('textarea');
   if (ta.classList.contains('large-width'))
      return 'large-width';
   else
      return 'small-width';
};

function toDataURL(src, outputFormat) {
   return new Promise((rs, rj) => {
      var img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = function () {
         var canvas = document.createElement('CANVAS');
         var ctx = canvas.getContext('2d');
         var dataURL;
         canvas.height = this.naturalHeight;
         canvas.width = this.naturalWidth;
         ctx.drawImage(this, 0, 0);
         dataURL = canvas.toDataURL(0.1);

         rs(dataURL);

         canvas = null;
         img = null;
      };
      img.src = src;
   });
}

function pxtoint(rule) {
   return parseInt(rule.replace(/px/, ''));
}

function get_mdc_data() {
   let mdc = {
      uid: qs_mdc().dataset.mds_dcUid,
      budstikke_wood_color: qs_mdc().dataset.mds_dcBudstikkewoodcolor,
      motive_budstikke_url: qs_mdc_motive_budstikke_url(),
      motive_sendtype_url: qs_mdc().dataset.mds_dcSendTypeMotiveUrl,
      send_type: qs_mdc().dataset.mds_dcSendType,
      status: qs_mdc().dataset.mds_dcStatus,
      pages: qs_mdc_pages_count(),
      created: qs_mdc().dataset.mds_dcCreated,
      saved: qs_mdc().dataset.mds_dcSaved
   };

   qs_mdc_pages().forEach((page) => {
      let ta = page.querySelector('textarea');
      let img = page.querySelector('img');
      let page_index_key = 'page_' + page.dataset.mds_pageNum;
      mdc[page_index_key] = {
         content_img_url: (img) ? img.src : '',
         offset_y_content_img: (img) ? img.dataset.mds_offsetY : '',
         greeting_height: ta.dataset.mds_offsetHY,
         greeting: {
            content: ta.value,
            style: {
               fontcolor: (ta.style.color.length !== 7) ? rgb2hex(ta.style.color) : ta.style.color,
               fontfamily: ta.style.fontFamily,
               fontstyle: ta.style.fontStyle,
               fontweight: ta.style.fontWeight,
               fontsize: ta.style.fontSize,
               width: get_page_specific_ta_width_classname(page)
            }
         }
      };
      if (parseInt(page.dataset.mds_pageNum) === qs_mdc_pages_count()) { // last page
         mdc[page_index_key].offset_y_canvas_sig = page.querySelector('#mds_maindc-can-sig').dataset.mds_offsetY;
         mdc[page_index_key].canvas_signature = sig_pad.toData();
      }
   });

   return mdc;
}
/**
 * Compares to dcs against each for changes
 * 
 * @param {object} dc1 - dc2 must be set if this parameter is set - the dc to compare against dc2
 * @param {object} dc2 - dc1 must be set if this parameter is set - the dc to compare against dc1
 * 
 * @returns {boolean} true if dcs are same and false otherwise
 */
function are_dcs_the_same(dc_1 = {}, dc_2 = {}) {

   if (dc_1 === undefined || dc_2 == undefined) {
      console.log('are_dcs_the_same: dc_1 or dc_2 are undefined.');
   }

   let dc1 = new Object();
   let dc2 = new Object();

   // important that we copy the objects so we dont change values on the objects passed as params
   Object.assign(dc1, dc_1);
   Object.assign(dc2, dc_2);

   // we delete irrelevant properties
   delete dc1.status;
   delete dc1.saved;
   delete dc1.created;

   delete dc2.status;
   delete dc2.saved;
   delete dc2.created;

   let page_indexes = ['page_1', 'page_2', 'page_3', 'page_4', 'page_5', 'page_6'];
   dc1.pages = parseInt(dc1.pages);
   dc2.pages = parseInt(dc2.pages);

   if (dc1.pages !== dc2.pages) return false;
   console.log('here');

   for (const key in dc1) {
      if (page_indexes.includes(key)) {

         for (const key_x in dc1[key]) {
            if (key_x !== 'greeting' && key_x !== 'canvas_signature') {
               if (key_x === 'greeting_height' || key_x === 'offset_y_canvas_sig' || key_x === 'offset_y_content_img') {
                  if (dc1[key][key_x] === undefined || dc2[key][key_x] === undefined) {
                     console.log('something wrong. key_x ' + key_x);
                  } else {
                     let o1 = parseInt(dc1[key][key_x]);
                     let o2 = parseInt(dc2[key][key_x]);
                     if (o1 > o2) {
                        if ((o1 - o2) > 10) {
                           return false;
                        }
                     } else {
                        if ((o2 - o1) > 10) {
                           return false;
                        }
                     }
                  }
               } else {
                  if (dc1[key][key_x] !== dc2[key][key_x]) return false;
               }
            } else {
               if (dc1[key].greeting.content !== dc2[key].greeting.content) return false;
               if (dc1[key].content_img_url !== dc2[key].content_img_url) return false;
            }
         }

         for (const key_j in dc1[key].greeting.style) {
            if (dc1[key].greeting.style[key_j] !== dc2[key].greeting.style[key_j]) return false;
         }

         // check last page for changes in canvas signature
         if (key === ('page_' + dc1.pages)) {
            let c1 = JSON.stringify(dc1[key].canvas_signature);
            let c2 = JSON.stringify(dc2[key].canvas_signature);
            if (c1 !== c2) return false;
         }
      } else {
         if (dc1[key] !== dc2[key]) return false;
      }
   }

   return true;
}

function delete_curr_page() {

   if (!user_login_check()) return;

   if (qs_mdc_pages_count() === 1) {
      popup('warn', 'Du må ha minst en side.');
      return;
   }

   let pt_select = document.querySelector('#mds_pagethumb-select');

   let del_pagenum = qs_mdc_curr_page_num();
   let pages = qs_mdc_pages();

   // page thumb MUST be deleted BEFORE page so we can access the current page num
   pt_select.querySelector('.mds_pt[data-mds_ptnum="' + del_pagenum + '"]').remove();
   qs_mdc_curr_page().remove(); // its now safe to remove the curr page node

   let is_last = true;
   // pagenumbers must be rearranged only if the deleted pagenum is lower then
   // total pages, otherwise its ok because pagenumbers are still in correct orders because
   // we deleted the last node
   if (del_pagenum < qs_mdc_pages_count() + 1) { // pretend as if the deleted node still counts for total pagenodes so we can see if there is any rearranging to do
      is_last = false;
      for (i = 0; i < pages.length; i++) {
         let page_num = parseInt(pages[i].dataset.mds_pageNum);
         if (page_num > del_pagenum) {
            let decreased_pnum = page_num - 1;
            pages[i].dataset.mds_pageNum = decreased_pnum;
            let pt = pt_select.querySelector('.mds_pt[data-mds_ptnum="' + page_num + '"]');
            pt.dataset.mds_ptnum = decreased_pnum;
            pt.textContent = decreased_pnum;
         }
      }
   } else if (del_pagenum === qs_mdc_pages_count() + 1) {
      move_canvas_sig_to_lastpage(del_pagenum - 1);
   }

   qs_mdc().dataset.mds_dcPages = qs_mdc_pages_count();

   if (is_last) {
      change_page(del_pagenum - 1);
   } else {
      change_page(del_pagenum);
   }
}

function style_greeting_text(style) {
   if (typeof (style) === 'number') toString(style);
   let fontfaces = ['helvetica', 'times', 'georgia'];
   let fontsizes = ['12px', '13px', '14px', '15px', '16px', '17px', '18px', '19px', '20px', '21px', '22px', '23px', '24px'];
   let ta = qs_mdc_curr_page().querySelector('textarea');

   if (style === 'bold') {
      if (ta.style.fontWeight !== 'bold') {
         ta.style.fontWeight = 'bold';
      } else {
         ta.style.fontWeight = '';
      }
   } else if (style === 'italic') {
      if (ta.style.fontStyle !== 'italic') {
         ta.style.fontStyle = 'italic';
      } else {
         ta.style.fontStyle = '';
      }
   } else if (style === 'large-width') {
      if (!ta.classList.contains(style)) {
         ta.classList.add(style);
      }
      else {
         ta.classList.remove(style);
      }
   } else if (fontfaces.includes(style)) {
      if (ta.style.fontFamily !== style) {
         ta.style.fontFamily = style;
      }
   } else if (fontsizes.includes(style)) {
      if (ta.style.fontSize !== style) {
         ta.style.fontSize = style;
      }
   } else {
      ta.style.color = style;
   }

   constrain_text_width();
}


/**
 * @param {string} uid - uid of designcard to return
 * @returns {object|false} the designcard in JS object if dc is found, false otherwise
 */
function get_cached_dc(uid) {

   if (!localStorage.getItem('dcs')) return false;

   let dcs = JSON.parse(localStorage.getItem('dcs'));
   if (dcs.length > 0) {
      for (i = 0; i < dcs.length; i++) {
         if (dcs[i].uid === uid) {
            return dcs[i];
         }
      }
   }
   return false;
}

let qs_saved_dcs = () => { return document.querySelectorAll('#mds_saved-dcs .mds_saved-dc'); };

function get_cached_dcs() {
   return JSON.parse(localStorage.getItem('dcs'));
}

function update_cache_dcs(dc_to_save) {
   let dcs = JSON.parse(localStorage.getItem('dcs'));
   for (i = 0; i < dcs.length; i++) {
      if (dcs[i].uid === dc_to_save.uid) {
         dcs[i] = dc_to_save;
         localStorage.setItem('dcs', JSON.stringify(dcs));
         return;
      }
   }

   dcs.push(dc_to_save);
   localStorage.setItem('dcs', JSON.stringify(dcs));
}

/**
 * @returns {boolean} false if user is not logged in and true otherwise
 */
function user_login_check() {
   if (!user_logged_in) {
      show_html(qs_user_reg_login_overlay());
      show_html(qs_user_login_modal());
      return false;
   }
   return true;
}

function set_savetime(timestamp, is_php_timestamp) {
   return new Date().toLocaleString(
      'nb-NO',
      { year: '2-digit', month: 'numeric', day: 'numeric', minute: 'numeric', hour: 'numeric' });
}

/**
 * saves the mdc to db, if new is true, then it will save and create a new designcard as well
 * 
 * @param {boolean} silent 
 * @param {boolean} save_and_add_new 
 * @param {request_callback} cb - The callback that handles the response.
 * 
 * @callback request_callback
 * @param {number} status - http status code
 * @param {string} res - response message
 */

function save_mdc(silent, cb) {

   // avoid saving if mdc is default or has no new changes
   if (is_default_mdc()) {
      if (!silent) popup('warn', 'Du må gjøre endringer før du kan lagre.');
      if (cb) cb(200, { msg: 'dc_default' });
      return;
   } else if (are_dcs_the_same(get_mdc_data(), get_cached_dc(qs_mdc_uid()))) {
      if (!silent) popup('info', 'Ingen nye endringer å lagre.');
      console.log('save_mdc: no new changes');
      if (cb) cb(200, { msg: 'dc_no_changes_or_error' });
      return;
   }

   let dc_to_save = get_mdc_data(); // raw DOM data
   dc_to_save.saved = set_savetime();

   if (!silent) popup('load', 'Lagrer . . .');

   // ajax
   ajax('save', 'dc=' + JSON.stringify(dc_to_save), (status, res) => {

      // prompt loader bar
      if (status === 200) {

         if (res.msg === 'dc_saved_new' || res.msg === 'dc_new_row_new_saved') {
            dc_to_save.uid = res.xtra.new_uid;
            qs_mdc().dataset.mds_dcUid = res.xtra.new_uid;
         }

         qs_mdc().dataset.mds_dcSaved = dc_to_save.saved;
         update_cache_dcs(dc_to_save);
         update_mdc_lastsaved_view(dc_to_save.saved, dc_to_save.created);

         // user msg
         if (!silent)
            if (res.msg === 'dc_no_changes_or_error') popup('info', 'Ingen nye endringer å lagre.');
            else if (res.msg === 'dc_saved' || res.msg === 'dc_new_row_saved') popup('succ', 'Lagret.');
            else if (res.msg === 'dc_saved_new' || res.msg === 'dc_new_row_new_saved') popup('succ', 'Nytt gratulasjonskort lagt til.');

         // fire cb
         if (cb) cb(status, res);

      } else {

         if (res.msg === 'save_dc_storage_limit_reached') {
            popup('err', 'Du har nådd maks grensen for antall lagrede gratulasjonskort. Vennligst send eller slett noen for å legge til nye.')
            return;
         }

         if (!silent) popup('err', 'En feil skjedde, Kunne ikke lagre endringene.');
      }
   });
}

qs_sendtype_img_src = () => { return document.querySelector('#mds_sendtype-info img'); };
qs_sendtype_divtext = () => { return document.querySelector('#mds_preview-sendtype .mds_tab-btns div'); };

/**
 * Saves the current main designcard, moves it to the right sidebar and loads the new 
 * designcard as the main
 * 
 * @param {string} uid - the uid of the designcard to load, if value is 'new', it will load a default mdc (it also saves it to the local cache), otherwise, it load the desired dc from the local cache
 */
function load_mdc(uid) {

   let mdc = new Object();
   if (uid === 'new') {
      mdc = default_mdc();
      update_cache_dcs(mdc);
      qs_saved_dcs().forEach((e) => {
         if (e.classList.contains('mds_dc-saved-active')) {
            e.classList.remove('mds_dc-saved-active');
         }
      });
   }
   else {
      mdc = get_cached_dc(uid);
   }

   let display_send_type = mdc.send_type;
   if (display_send_type === 'envelope')
      display_send_type = 'Brev';
   else if (display_send_type === 'hylse') {
      display_send_type = 'Hylse';
   }

   document.querySelector('#mds_preview-sendtype .mds_tab-btns div').textContent = display_send_type;
   qs_sendtype_img_src().src = mdc.motive_sendtype_url;

   if (qs_mdc_pages_count() > 0) {
      qs_mdc_pages().forEach(e => e.remove());
   }

   qs_mdc().dataset.mds_dcUid = mdc.uid;
   qs_mdc().dataset.mds_dcStatus = mdc.status;
   qs_mdc().dataset.mds_dcPages = mdc.pages;
   qs_mdc().dataset.mds_dcSendType = mdc.send_type;
   qs_mdc().dataset.mds_dcCurrPage = 1; // first page is enabled by default
   qs_mdc().dataset.mds_dcSendTypeMotiveUrl = mdc.motive_sendtype_url;
   qs_mdc().dataset.mds_dcBudstikkewoodcolor = mdc.budstikke_wood_color;
   qs_mdc().style.background = 'url(' + mdc.motive_budstikke_url + ')';
   qs_mdc().dataset.mds_dcSaved = mdc.saved;
   qs_mdc().dataset.mds_dcCreated = mdc.created;

   let page_nodes = new_page_node(mdc, true, true);
   page_nodes.forEach(page_node => qs_mdc().appendChild(page_node));
   //sig_pad.fromData(mdc['page_' + mdc.pages].canvas_signature);
   //move_canvas_sig_to_lastpage(); // now safe to move canvas signature pad

   qs_mdc().dataset.mds_dcPages = qs_mdc_pages_count(); // update MDC data
   qs_page_num_show().textContent = '1';
   pagethumb_active(1); // make page thumb 1 active

   set_proper_offset_height();
   auto_resize_curr_page_textarea_greeting();

   update_mdc_lastsaved_view(mdc.saved, mdc.created);
   update_styling_panel_with_curr_page_settings();
}

function auto_resize_curr_page_textarea_greeting() {
   let cp_ta = qs_mdc_curr_page().querySelector('textarea');
   cp_ta.style.height = cp_ta.dataset.mds_offsetHY + 'px';
}

function set_proper_offset_height() {
   let cp_has_img = qs_mdc_curr_page().querySelector('img');
   let cp_has_canv = qs_mdc_curr_page().querySelector('canvas');

   if (cp_has_img && cp_has_canv) {
      qs_mdc_curr_page().querySelector('textarea').style.maxHeight = '388px';
   } else if (cp_has_img) {
      qs_mdc_curr_page().querySelector('textarea').style.maxHeight = '543px';
   } else if (cp_has_canv) {
      qs_mdc_curr_page().querySelector('textarea').style.maxHeight = '591px';
   } else {
      qs_mdc_curr_page().querySelector('textarea').style.maxHeight = '730px';
   }
}

qs_bswoodcolor_inputs = () => { return document.querySelectorAll('#mds_select-bswoodcolor input'); };

function make_mdc_active_in_rightsidebar(old_uid) {

   let saved_dcs = qs_saved_dcs();
   let found = false;

   if (old_uid === 'new') {
      saved_dcs.forEach((dc) => {
         dc.classList.remove('mds_dc-saved-active');
      });
   }

   for (i = 0; i < saved_dcs.length; i++) {
      if (saved_dcs[i].dataset.mds_dcUid === qs_mdc_uid()) {
         found = true;
         break;
      }
   }

   if (!found) new_saved_dc_node_in_rightsidebar(qs_mdc_uid());

   let cn = 'mds_dc-saved-active';
   qs_saved_dcs().forEach((e) => {
      if (e.dataset.mds_dcUid === qs_mdc_uid()) {
         if (!e.classList.contains(cn)) {
            e.classList.add(cn);
         }
      } else {
         if (e.classList.contains(cn)) {
            e.classList.remove(cn);
         }
      }
   });
}

function new_saved_dc_node_in_rightsidebar(uid) {
   if (uid === 'new') { console.log('cant add dc uid "new" as saved dc in rightsidebar, uid MUST be unique'); return; }

   sdc = get_cached_dc(uid);

   let divparent = document.createElement('div');
   divparent.className = 'mds_saved-dc';

   let i_node = document.createElement('i');
   i_node.className = 'fas fa-scroll';

   divparent.appendChild(i_node);

   let divinfo = document.createElement('div');
   divinfo.className = 'mds_saved-dc-info';

   let spansaved = document.createElement('span');
   spansaved.className = 'mds_saved-dc-info-saved';
   spansaved.textContent = sdc.saved;

   let spancreated = document.createElement('span');
   spancreated.className = 'mds_saved-dc-info-created';
   spancreated.textContent = sdc.created;

   divinfo.appendChild(spansaved);
   divinfo.appendChild(spancreated);
   divparent.appendChild(divinfo);

   divparent.dataset.mds_dcUid = uid;

   divparent.onclick = (e) => {
      saved_dc_uid = e.currentTarget.dataset.mds_dcUid;

      if (qs_mdc_uid() !== saved_dc_uid) {
         popup('load', 'Lagrer budstikken . . .');
         save_mdc(true, (status, res) => {
            if (status === 200) {
               load_mdc(saved_dc_uid);
               make_mdc_active_in_rightsidebar();
               popup('hide');
            }
         });
      }
   };

   document.querySelector('#mds_saved-dcs').appendChild(divparent);

   update_rightsidebar_count();
}

function is_default_mdc() {

   if (qs_mdc_pages_count() > 1) return false;

   mdc = get_mdc_data();
   def_mdc = default_mdc();

   delete mdc.uid;
   delete def_mdc.uid;

   return are_dcs_the_same(mdc, def_mdc);
}

qs_receiver_form = () => { return document.querySelector('#mds_popup-receiver-form .mds_form'); };

function ajax_register_receiver_and_proceed() {
   let form = qs_receiver_form();
   let inputs = form.querySelectorAll('input');

   receiver = new Object();

   for (i = 0; i < inputs.length; i++) {
      let input = inputs[i];
      if (input.name === 'email_reminder') {
         receiver[input.name] = input.checked + '';
      } else if (input.value) {
         receiver[input.name] = input.value;
      } else {
         popup('err', 'Du må fylle ut alle felt!');
         return;
      }
   }

   let postdata = 'receiverinfo=' + JSON.stringify(receiver) + '&dc=' + JSON.stringify(get_mdc_data());
   if (is_mobile) postdata += '&is_mobile=true';

   ajax('step2', postdata, (status, res) => {
      if (status === 200) {
         window.location.href = mds_cs_globals.checkout_url;
         console.log('Registered receiverinfo, proceeding to checkout.');
      } else {
         popup('err', 'Noe gikk galt, prøv på nytt senere.');
      }
   });
}

function register_receiver_and_proceed() {

   if (is_default_mdc()) { // dc is default so we prevent sending it
      popup('warn', 'Du må gjøre endringer på gratulasjonskortet før det kan sendes.');
      return;
   } else if (!user_logged_in) {
      popup('load', 'Lagrer mottakerinfo og går videre til kassen');
      ajax_register_receiver_and_proceed();
   } else if (are_dcs_the_same(get_mdc_data(), get_cached_dc(qs_mdc_uid()))) { // dc has no new changes so we register receiverinfo and proceed
      popup('load', 'Lagrer mottakerinfo og går videre til kassen . . .');
      ajax_register_receiver_and_proceed();
   } else { // dc must be saved before we register receiverinfo and proceed
      popup('load', 'Lagrer gratulasjonskort, mottakerinfo og går videre til kassen . . .');

      save_mdc(true, (status, res) => {
         if (status === 200) {
            ajax_register_receiver_and_proceed();
         } else {
            console.log('register_receiver_and_proceed: couldnt save mdc before checkout.');
         }
      });
   }
}

function popup_receiver_form(close) {
   let form = document.querySelector('#mds_receiver-form-overlay');
   let cn = 'mds_d-none-i';

   if (close) {
      if (!form.classList.contains(cn)) {
         form.classList.add(cn);
      }
   } else {
      if (form.classList.contains(cn)) {
         form.classList.remove(cn);
      }
   }
}

function remove_dc_from_rightsidebar(dc_uid_to_del) {
   let saved_dcs = qs_saved_dcs();
   for (i = 0; i < saved_dcs.length; i++) {
      if (saved_dcs[i].dataset.mds_dcUid === dc_uid_to_del) {
         saved_dcs[i].remove();
      }
   }
}

qs_user_reg_login_overlay = () => { return document.querySelector('#mds_reg-login-modal-overlay'); };
qs_user_login_modal = () => { return document.querySelector('#mds_login-modal'); };
qs_user_reg_modal = () => { return document.querySelector('#mds_reg-modal'); };
qs_header_el_login_btn = () => { return document.querySelector('#mds_header-login-btn'); };
qs_header_user_reg_login_prompt = () => { return document.querySelector('#mds_login-prompt-header'); };
qs_user_reg_thankyou = () => { return document.querySelector('#mds_reg-thankyou'); };


function hide_html(el) {
   if (Array.isArray(el)) {
      el.forEach((e) => {
         if (!e.classList.contains('mds_d-none-i')) {
            e.classList.add('mds_d-none-i');
         }
      });
   } else if (typeof (el) === 'object') {
      if (!el.classList.contains('mds_d-none-i')) {
         el.classList.add('mds_d-none-i');
      }
   }
}

function show_html(el) {
   if (el.classList.contains('mds_d-none-i')) {
      el.classList.remove('mds_d-none-i');
   }
}

let mds_gcaptcha_time_start;
let mds_gcaptcha_res;

function mds_captcha_verify(response) {
   mds_gcaptcha_time_start = new Date().getTime();
   mds_gcaptcha_res = response;
}

function ui_login(status) {

   show_html(qs_user_reg_login_overlay());

   switch (status) {
      case 'login':
         hide_html([qs_user_reg_modal(), qs_user_reg_thankyou()]);
         show_html(qs_user_login_modal());
         break;
      case 'reg':
         hide_html([qs_user_login_modal(), qs_user_reg_thankyou()]);
         show_html(qs_user_reg_modal());
         break;
      case 'reg_succ':
         hide_html([qs_user_reg_modal(), qs_user_login_modal()]);
         show_html(qs_user_reg_thankyou());
         break;
      case 'login_succ':
         hide_html([qs_user_reg_modal(), qs_user_reg_thankyou()]);
         show_html(qs_user_reg_thankyou());
         break;
      case 'close':
         hide_html(qs_user_reg_login_overlay());
         if (mds_cs_globals.user_is_logged_in === '0') {
            show_html(qs_header_user_reg_login_prompt());
         }
         break;
   }
}

function get_unique_cached_dc() {
   let dcs = JSON.parse(localStorage.getItem('dcs'));
   if (dcs.length > 0) {
      for (i = 0; i < dcs.length; i++) {
         if (dcs[i].uid !== 'new') {
            console.log('get_unique_cached_dc: user has one');
            return dcs[i];
         }
      }
   }

   console.log('get_unqie_cached_dc: user has no saved dcs');
   return false;
}

function delete_dc(dc_uid_to_del) {

   if (!user_login_check()) return;

   if (is_default_mdc()) {
      popup('warn', 'Du må gjøre endringer før du kan slette gratulasjonskortet.');
      return;
   } else if (dc_uid_to_del === 'new') {
      // just a local delete
      let dc_to_del = get_cached_dc(dc_uid_to_del);
      let dcs = JSON.parse(localStorage.getItem('dcs'));
      for (i = 0; i < dcs.length; i++) {
         if (dcs[i].uid === dc_uid_to_del) {
            sig_pad.clear();
            dcs.splice(i, 1, default_mdc());
            localStorage.setItem('dcs', JSON.stringify(dcs));
            popup('succ', 'Gratulasjonskortet er slettet.');

            let unique_dc = get_unique_cached_dc();
            if (unique_dc) {
               load_mdc(unique_dc);
               make_mdc_active_in_rightsidebar();
               console.log('delete_dc: local delete of "new", user had saved dc so loaded last saved dc');
               return;
            } else {
               load_mdc('new');
               console.log('delete_dc: local delete of "new", user had no saved dcs so loaded a new default one.');
               return;
            }

         }
      }
   }

   // database delete
   if (get_cached_dc(dc_uid_to_del)) {
      popup('load', 'Sletter gratulasjonskort . . .');
      ajax('delete', '&dc_uid=' + dc_uid_to_del, (status, res) => {
         if (status === 200) {

            // success, now lets update the local cache
            let dcs = JSON.parse(localStorage.getItem('dcs'));
            for (i = 0; i < dcs.length; i++) {
               if (dcs[i].uid === dc_uid_to_del) {
                  dcs.splice(i, 1);
                  localStorage.setItem('dcs', JSON.stringify(dcs));

                  // remove the deleted dc from the right sidebar
                  remove_dc_from_rightsidebar(dc_uid_to_del);

                  // load a new mdc right away
                  let unique_dc = get_unique_cached_dc();
                  if (unique_dc) {
                     load_mdc(unique_dc.uid);
                     make_mdc_active_in_rightsidebar();
                     console.log('delete_dc: local delete of "new", user had saved dc so loaded last saved dc');
                  } else {
                     load_mdc('new');
                     console.log('delete_dc: local delete of "new", user had no saved dcs so loaded a new default one.');
                  }


                  popup('succ', 'Slettet gratulasjonskortet.'); // we are done, lets prompt the user about the action

                  update_rightsidebar_count();

                  break;
               }
            }
         } else {
            if (res.msg === 'delete_dc_dc_doesnt_exists') {
               popup('err', 'Kunne ikke slette gratulasjonskortet siden den ikke eksisterer.');
            } else {
               popup('err', 'Noe gikk galt, kunne ikke slette gratulasjonskortet.');
            }
         }
      });
   } else {
      console.log('DC has unique id but doesnt exists in database, this shouldnt happen.');
   }
}

// file upload form for content image
// form is static across all pages
let qs_mdc_file_form = () => { return document.querySelector('form#mds_mdc-con-img-upload-form'); };
let qs_mdc_file_field = () => { return qs_mdc_file_form().querySelector('input[type="file"]'); };



function ajax_dc_content_img_upload() {
   let input_file = qs_mdc_file_field().files[0];
   if (input_file) {
      let formdata = new FormData();
      formdata.append('file', input_file);
      formdata.append('dc_uid', qs_mdc_uid());
      formdata.append('mds_ftype_order__', qs_mdc_file_form().querySelector('input[name=mds_ftype_order]').value);

      // client side validation
      if (!(input_file.type === 'image/jpeg' || input_file.type === 'image/png'))
         popup('err', 'Kun filtyper av JPG og PNG er tillat.');

      if (input_file.size > 3145768) // 3mb max size
         popup('err', 'Bilde kan ikke være større enn maks filstørrelse 3MB.');

      let xhr = new XMLHttpRequest();
      formdata.append('_ajax_nonce', mds_cs_globals.ajax.nonce);
      formdata.append('action', mds_cs_globals.ajax.actions.content_img_fileupload);

      popup('load', 'Laster opp bilde . . .');

      // file upload ajax request
      xhr.responseType = 'json';
      xhr.onload = () => {
         if (mds_debug) {
            console.log(xhr.response);
            console.log(xhr.responseType);
         }
         let res = xhr.response;
         if (xhr.status === 200) {
            if (qs_mdc_curr_page().querySelector('img')) {
               qs_mdc_curr_page().querySelector('img').src = res.xtra.img_url;
            } else {
               add_img_node_to_curr_page(res.xtra.img_url);
            }
            set_proper_offset_height();
            popup('succ', 'Bilde ble lastet opp.');
         } else {
            let err_msg = '';
            if (res.msg === 'con_img_upload_no_dc_belonging') err_msg = 'Fant ingen gratulasjonskort som tilhørte bilde så lagret ikke.';
            if (res.msg === 'con_img_upload_file_too_big') err_msg = 'Kun filtyper av JPG og PNG er tillat.';
            if (res.msg === 'con_img_upload_file_too_big') err_msg = 'Bilde kan ikke være større enn maks filstørrelse 3MB.';
            if (res.msg === 'con_img_upload_missing_post_fields' || res.msg === 'con_img_upload_validation_failed'
               || res.msg === 'con_img_upload_resize_failed') err_msg = 'Noe gikk galt, kunne ikke laste opp bilde.';
            popup('err', err_msg);
         }
      }
      xhr.open('POST', mds_cs_globals.ajax.ajax_url);
      xhr.send(formdata);
   }
}

function dc_content_img_upload() {
   if (!user_login_check()) {
      return;
   }

   if (qs_mdc_uid() === 'new') {
      save_mdc(true, (status, res) => {
         if (status === 200) {
            ajax_dc_content_img_upload();
         }
      });
   } else {
      ajax_dc_content_img_upload();
   }
}
qs_rightsidebar = () => { return document.querySelector('#mds_right-sidebar'); };
function update_rightsidebar_count() {
   let count = qs_rightsidebar().querySelectorAll('#mds_saved-dcs .mds_saved-dc').length;
   if (count === 0) {
      qs_rightsidebar().querySelector('h5').textContent = 'Lagret (0)';
   } else if (count === 1) {
      qs_rightsidebar().querySelector('h5').textContent = 'Lagret (1)'
   } else if (count > 1) {
      qs_rightsidebar().querySelector('h5').textContent = 'Lagret (' + count + ')';
   }
}

function update_mdc_lastsaved_view(lastsave, created) {
   let mdc_saveinfo_col = document.querySelector('#mds_top-mdc-saveinfo-col');
   if (lastsave) {
      mdc_saveinfo_col.querySelector('#mds_mdc-lastsave-view').textContent = lastsave;
   } else {
      mdc_saveinfo_col.querySelector('#mds_mdc-lastsave-view').textContent = 'ikke lagret';
   }
   if (created !== undefined) {
      mdc_saveinfo_col.querySelector('#mds_mdc-created-view').textContent = created;
   }
}

qs_autosave_check_input = () => { return document.querySelector('#mds_autosave-check'); };


let qs_sendtype_preview_overlay = () => { return document.querySelector('#sendmotive_preview_fullscreen'); };

document.querySelector('#mds_sendtype-info span').onclick = () => {
   let overlay = qs_sendtype_preview_overlay();
   overlay.classList.remove('mds_d-none-i');
   overlay.querySelector('img').src = qs_sendtype_img_src().src;
}

qs_sendtype_preview_overlay().querySelector('a').onclick = () => {
   let overlay = qs_sendtype_preview_overlay();
   if (!overlay.classList.contains('mds_d-none-i')) {
      overlay.classList.add('mds_d-none-i');
   }
}


/**
 * Prompts the login window if the user isnt logged in
 * 
 * @returns {boolean} - True if user is logged in and false otherwise
 */
function user_login_check() {
   if (!user_logged_in) {
      show_html(qs_user_reg_login_overlay());
      show_html(qs_user_login_modal());
      return false;
   }
   return true;
}

function init() {

   localStorage.setItem('default_mdc', JSON.stringify({
      budstikke_wood_color: "Gold",
      motive_budstikke_url: get_default_budstikke_motive_url(),
      motive_sendtype_url: get_default_hylse_motive_url(),
      page_1:
      {
         canvas_signature: [],
         offset_y_canvas_sig: "157",
         greeting_height: "112",
         offset_y_content_img: '333',
         content_img_url: "https://www.mittditt.no/wp-content/uploads/user_content_images/1603458121.jpg",
         greeting: {
            content: "Gratulerer med dagen [navn], hilsen din kjære [navn]!",
            style: {
               fontcolor: "#424242",
               fontfamily: "georgia",
               fontstyle: "italic",
               fontweight: "bold",
               fontsize: '20px',
               width: "small-width",
            }
         }
      },
      pages: 1,
      send_type: "hylse",
      status: 'saved',
      uid: 'new',
      saved: 'ikke lagret',
      created: set_savetime()
   }));

   // admin uploaded motives
   for (const motive of mds_cs_globals.uploaded_motives) {
      let img_node = document.createElement('img');
      img_node.src = motive.thumb_url;
      if (motive.motive_type === 'envelope' || motive.motive_type === 'hylse') {
         img_node.dataset.mds_thumbUrl = motive.thumb_url;
         img_node.dataset.mds_sendType = motive.motive_type;
         img_node.onclick = (e) => {
            let e_turl = e.currentTarget.dataset.mds_thumbUrl;
            let e_mtype = e.currentTarget.dataset.mds_sendType;
            qs_sendtype_img_src().src = e_turl;
            qs_mdc().dataset.mds_dcSendType = e_mtype;
            qs_mdc().dataset.mds_dcSendTypeMotiveUrl = e_turl;
            if (e_mtype === 'envelope')
               qs_sendtype_divtext().textContent = 'Brev';
            else if (e_mtype === 'hylse') {
               qs_sendtype_divtext().textContent = 'Hylse';
            }
         }
      } else {
         img_node.dataset.mds_a5Url = motive.a5_url;
         img_node.onclick = (e) => {
            if (qs_mdc_motive_budstikke_url() !== motive.a5_url)
               qs_mdc().style.background = 'url(' + motive.a5_url + ')';
         }
      }
      document.querySelector('#mds_' + motive.motive_type + '-motive').appendChild(img_node);
   }

   // admin uploaded budstikke wood colors
   qs_bswoodcolor_inputs().forEach((input) => {
      input.onchange = (e) => {
         if (qs_mdc().dataset.mds_dcBudstikkewoodcolor !== e.currentTarget.id) {
            qs_mdc().dataset.mds_dcBudstikkewoodcolor = e.currentTarget.id;
         }
      }
   });

   // make it easy for user to select bswoodcolor inputs with just clickign the box surrounding it
   document.querySelectorAll('.mds_select-bswc-box').forEach((e) => {
      e.onclick = (t) => {
         t.currentTarget.querySelector('input[type=radio]').checked = true;
      }
   });



   let dcs = mds_cs_globals.user_designcards;
   let only_default_dc = false;

   if (!dcs.length) { // load a new local default designcard
      dcs.push(default_mdc());
      only_default_dc = true;
   }

   dcs.forEach((dc) => {
      for (i = 0; i < dc.pages; i++) {
         dc['page_' + (i + 1)].greeting.content = dc['page_' + (i + 1)].greeting.content.replace(/_lb_/g, '\n')
      }
   });

   localStorage.setItem('dcs', JSON.stringify(dcs));

   // right sidebar with saved designcards
   if (!only_default_dc) {
      for (const saved_dc of dcs) {
         new_saved_dc_node_in_rightsidebar(saved_dc.uid);
      }
   }

   if (!only_default_dc) update_rightsidebar_count();

   // Main designcard HTMl
   load_mdc(dcs[dcs.length - 1].uid); // Load the last edited designcard as main
   if (!only_default_dc) make_mdc_active_in_rightsidebar();

   /**
    * top styling panel, top mdc panel and bottom mdc panel
    */
   let top_styling_panel = document.querySelector('#mds_editor-topbar-styling');
   let select_fontsize = top_styling_panel.querySelector('#mds_select-fontsize');
   let select_fontface = top_styling_panel.querySelector('#mds_select-fontface');
   let color_input = top_styling_panel.querySelector('input[type=color]');
   let img_del_btn = top_styling_panel.querySelector('#mds_del-img-btn');
   img_del_btn.onclick = () => {
      qs_mdc_curr_page().querySelector('img').remove();
      set_proper_offset_height(); // removing img affects offset height so we must call the event to adjust accordingly
   }
   select_fontsize.onchange = (e) => {
      style_greeting_text(e.currentTarget.value + 'px');
   }
   select_fontface.onchange = (e) => {
      style_greeting_text(e.currentTarget.value);
   }
   color_input.oninput = (e) => {
      style_greeting_text(e.currentTarget.value);
   }

   let mdc_toppanel = document.querySelector('#mds_maindc-toppanel');
   let add_page_btn = mdc_toppanel.querySelector('#mds_maindc-addpage-btn');
   let prev_page_btn = mdc_toppanel.querySelector('#mds_maindc-prevpage-btn');
   let next_page_btn = mdc_toppanel.querySelector('#mds_maindc-nextpage-btn');
   let del_page_btn = mdc_toppanel.querySelector('#mds_maindc-del-page-btn');

   let mdc_bottompanel = document.querySelector('#mds_maindc-bottompanel');
   let del_mdc_btn = mdc_bottompanel.querySelector('#mds_maindc-del-designcard-btn');
   del_mdc_btn.onclick = () => {
      delete_dc(qs_mdc_uid());
   };

   add_page_btn.onclick = add_page;
   next_page_btn.onclick = () => {
      let curr_page_num = parseInt(qs_mdc().dataset.mds_dcCurrPage);
      if ((curr_page_num + 1) <= parseInt(qs_mdc().dataset.mds_dcPages)) {
         change_page(curr_page_num + 1);
      } else {
         change_page(1); // start at first page again
      }
   }
   prev_page_btn.onclick = () => {
      let curr_page_num = parseInt(qs_mdc().dataset.mds_dcCurrPage);
      if ((curr_page_num - 1) >= 1) {
         change_page(curr_page_num - 1);
      } else {
         change_page(qs_mdc().dataset.mds_dcPages); // go to last page

      }
   }
   del_page_btn.onclick = delete_curr_page;

   qs_popup().querySelector('button').onclick = () => {
      if (qs_popup().classList.contains('mds_d-block-i'))
         qs_popup().classList.remove('mds_d-block-i');
   }

   document.querySelector('#mds_show-receiver-form-btn').onclick = () => {
      popup_receiver_form();
   }
   document.querySelector('#mds_popup-receiver-form i').onclick = () => {
      popup_receiver_form(true);
   }

   show_or_hide_del_img_btn();

   let tab_sections = [
      document.querySelector('#mds_select-motives'),
      document.querySelector('#mds_preview-sendtype'),
      document.querySelector('#mds_select-bswoodcolor')
   ];

   tab_sections.forEach((tabsection) => {
      tabsection.querySelectorAll('.mds_tablinks').forEach((tabbtn) => {
         tabbtn.onclick = (t) => {
            open_tab(
               t.currentTarget,
               t.currentTarget.dataset.mds_tabId,
               tabsection.dataset.mds_tabGroupClassname,
               tabsection.dataset.mds_tabShowClassname
            );
         }
      });
   });

   document.querySelectorAll('.mds_sgt-btn').forEach((e) => {
      e.onclick = (t) => {
         style_greeting_text(t.currentTarget.dataset.mds_sgt);
      };
   });

   document.querySelector('#mds_register-receiver-and-proceed-checkout').onclick = register_receiver_and_proceed;

   document.querySelectorAll('#mds_can-sig-select-color .mds_canv-sig-opt-color').forEach((e) => {
      e.onclick = (t) => {
         canvas_select_color(t.currentTarget.dataset.mds_canvSigColor);
      }
   });

   document.querySelector('#mds_canvas-erase-btn').onclick = canvas_erase;

   // event listeners for buttons: save dc, save dc and add new dc
   document.querySelector('#mds_maindc-new-designcard-btn').onclick = () => {

      if (!user_login_check()) {
         return;
      }

      if (is_default_mdc()) {
         popup('warn', 'Gratulasjonskortet er allerede nytt.');
         return;

      } else if (are_dcs_the_same(get_mdc_data(), get_cached_dc(qs_mdc_uid()))) {
         load_mdc('new');
         make_mdc_active_in_rightsidebar('new');

      } else {
         popup('load', 'Lagrer gjeldende gratulasjonskort før nytt legges til . . .');
         save_mdc(true, (status, res) => {
            if (status === 200) {

               if (res.msg === 'dc_saved_new' || res.msg === 'dc_new_row_new_saved') {
                  new_saved_dc_node_in_rightsidebar(qs_mdc_uid());
               }

               load_mdc('new');

               popup('hide');

            } else {
               console.log('new_designcard: couldnt save curr mdc so didnt add a new default');
               popup('err', 'Noe gikk galt, kunne ikke lagre.');
            }
         });
      }
   }

   document.querySelector('#mds_save-dc-btn').onclick = () => {

      if (!user_login_check()) {
         return;
      }

      save_mdc(false, (status, res) => {
         if (status === 200) {
            if (res.msg === 'dc_saved_new' || res.msg === 'dc_new_row_new_saved') {
               make_mdc_active_in_rightsidebar(res.xtra.new_uid);
            }
         }
      });
   }

   // content image upload event listeners
   qs_mdc_file_form().insertAdjacentHTML('beforeend', mds_cs_globals.ajax.mds_ftype_order);
   qs_mdc_file_field().onchange = dc_content_img_upload;


   // user login logic
   user_logged_in = mds_cs_globals.user_is_logged_in;

   qs_user_reg_modal().querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      if (mds_gcaptcha_time_start - new Date().getTime() < 100 * 1000/* 1.58 minutes in ms */) {
         let reg_form = qs_user_reg_modal();
         let username = reg_form.querySelector('input[name=mds_reg_username]').value;
         let email = reg_form.querySelector('input[name=mds_reg_email]').value;

         if (username !== null && email !== null) {
            ajax('register_user', 'username=' + username +
               '&email=' + email + '&g-recaptcha-response=' + mds_gcaptcha_res,
               (status, res) => {
                  if (status === 200) {
                     ui_login('reg_succ');
                     qs_user_reg_thankyou().querySelector('h4').textContent = 'Takk for at du registrerte deg.';
                     qs_user_reg_thankyou().querySelector('span').textContent = 'Det har blitt sendt en e-post med videre instrukser til ' + email + '.';
                  } else {
                     ui_login('reg_succ');
                     qs_user_reg_thankyou().querySelector('h4').textContent = 'Noe gikk galt.';
                     qs_user_reg_thankyou().querySelector('span').textContent = 'Prøv på nytt eller kontakt administrator.';
                  }
               });
         }
      }
   }

   // scale MDC accordingly to screen width
   if (is_mobile) {
      document.querySelector('#mds_maindc-wrapper').style.width = (window.screen.width - 13) + 'px';
      let scale = window.screen.width / 570;
      qs_mdc().style.transform = 'scale(' + scale + ')';
      let mb = (790 - (793 * scale));
      qs_mdc().style.marginBottom = (mb < 0) ? Math.abs(mb) + 'px' : '-' + mb + 'px';
   }

   if (user_logged_in === '0') {
      user_logged_in = false;
      let user_login_btns = document.querySelectorAll('.mds_user-login-btn');
      let close_login_reg_modal = document.querySelectorAll('.mds_close-login');
      let user_reg_btns = document.querySelectorAll('.mds_reg-user-btn');

      qs_header_user_reg_login_prompt().querySelector('button').onclick = () => {
         ui_login('login');
      }

      user_login_btns.forEach((e) => {
         e.onclick = () => {
            ui_login('login');
         }
      });

      user_reg_btns.forEach((e) => {
         e.onclick = () => {
            ui_login('reg');
         }
      });

      close_login_reg_modal.forEach((e) => {
         e.onclick = () => {
            ui_login('close');
         }
      });

      ui_login('login');
   } else if (user_logged_in === '1') {
      user_logged_in = true;
      autosave_v = parseInt(mds_cs_globals.autosave_pref);
      localStorage.setItem('mdc_autosave_pref', parseInt(autosave_v));
      qs_autosave_check_input().checked = Boolean(autosave_v);
   }

   qs_autosave_check_input().onchange = (e) => {

      if (!user_login_check()) return;

      curr_pref = parseInt(localStorage.getItem('mdc_autosave_pref'));
      if (e.currentTarget.checked) {
         if (curr_pref !== 1) {
            ajax_update_autosave(1);
         }
      } else {
         if (curr_pref !== 0) {
            ajax_update_autosave(0);
         }
      }
   }

   function ajax_update_autosave(v) {
      (v === 1) ? popup('load', 'Skrur på autolagring . . .') : popup('load', 'Skrur av autolagring . . .')
      ajax('update_autosave', 'update_autosave=' + v, (status, res) => {
         if (status === 200) {
            (v === 1) ? popup('info', 'Autolagring er på.') : popup('info', 'Autolagring er slått av.');
         } else {
            (v === 0) ? popup('err', 'Noe gikk galt, kunne ikke sette autolagring på.') : popup('err', 'Noe gikk galt, kunne ikke slå av autolagring.');
         }
         localStorage.setItem('mdc_autosave_pref', v);
      });
   }


   function test_populate_receiver_form() {
      let f = qs_receiver_form();
      let i = 0;
      f.querySelectorAll('input').forEach((e) => {
         if (e.name === 'birthday_date') {
            e.value = '2020-11-21';
         } else if (e.name === 'email_reminder') {
            e.checked = true;
         } else {
            e.value = 'tes' + i;
         }
         i++;
      });
      register_receiver_and_proceed();
   }

   setInterval(() => {
      if (parseInt(localStorage.getItem('mdc_autosave_pref')) !== 1) {
         return;
      }
      if (!is_default_mdc() && !are_dcs_the_same(get_mdc_data, get_cached_dc(qs_mdc_uid()))) {
         popup('load', 'Autolagrer endringer . . .');
         save_mdc(true, (status, res) => {
            if (status === 200) {
               popup('hide');
            } else {
               popup('err', 'Noe gikk galt, kunne ikke autolagre endringene.');
            }
         });
      }
   }, 5000);

}
window.onload = init();