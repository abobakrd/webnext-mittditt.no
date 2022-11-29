window.addEventListener('load', () => {
   console.log('initializing...');

   let dc = mds_dc_and_receiver.dc;

   for (i = 0; i < dc.pages; i++) {
      dc['page_' + (i + 1)].greeting.content = dc['page_' + (i + 1)].greeting.content.replace(/_lb_/g, '\n');
   }

   let dc_order_mobile = mds_dc_and_receiver.hasOwnProperty('dc_order_mobile');

   let canv_sig = document.createElement('canvas');
   let sig_pad = new SignaturePad(canv_sig);
   canv_sig.width = 200;
   canv_sig.height = 120;
   sig_pad.fromData(dc['page_' + dc.pages].canvas_signature);

   async function load_img(img) {
      return new Promise((resolve, reject) => {
         img.onload = function () {
            console.log("Image Loaded");
            resolve(true);
         };
      });
   }

   function px_to_pt(px) {
      return (px * 3) / 4;
   }

   //HTML to pdf
   async function dc_html_to_pdf(with_bg, wtest) {
      const { jsPDF } = window.jspdf;


      let pdf = new jsPDF({ format: 'a5', unit: 'px' });
      let pdf_w = pdf.internal.pageSize.getWidth();
      let pdf_h = pdf.internal.pageSize.getHeight();

      for (i = 0; i < dc.pages; i++) {

         let cp = dc['page_' + (i + 1)];

         let canv = document.createElement('canvas');

         let a5_px_w = 561;
         let a5_px_h = 793;

         // a5 mm dimensions to px
         canv.width = a5_px_w;
         canv.height = a5_px_h;

         let ctx = canv.getContext('2d');

         if (with_bg) {
            bg_img = new Image;
            bg_img.crossOrigin = 'anonymous';
            bg_img.src = dc.motive_budstikke_url;
            await load_img(bg_img);
            ctx.drawImage(bg_img, 0, 0, a5_px_w, a5_px_h);
         }

         if (cp.content_img_url) {
            con_img = new Image;
            con_img.crossOrigin = 'anonymous';
            con_img.src = cp.content_img_url;
            await load_img(con_img);
            let y = parseInt(cp.greeting_height) + 46;
            if (i === dc.pages - 1) {
               y += 140;
            }
            ctx.drawImage(con_img, (canv.width / 3) + 7, y, 170, 170);
         }

         if (i === dc.pages - 1) {

            ctx.drawImage(canv_sig, 180, parseInt(cp.greeting_height) + 40, canv_sig.width, canv_sig.height);
         }

         if (with_bg || cp.content_img_url || i === dc.pages - 1) {
            pdf.addImage(canv, 'PNG', 0, 0, pdf_w, pdf_h, undefined, 'FAST');
         }

         cp_style = cp.greeting.style;

         let text_max_width = Math.floor(pdf_w / 2);
         // the text width sizes are converted to mm from px (html view) and 
         // adjusted a little because excact converted value doesnt look 
         // identical to html view
         if (cp_style.width === 'large-width')
            text_max_width = Math.floor(pdf_w / 1.14); // mm repreesntation of 520px
         // mm repreesntation of 320px (adjusted a little because excact represenation does not look identical to html view)

         let fontsize = parseInt(cp_style.fontsize.match(/\d+/)[0]);
         pdf.setFontSize(fontsize * 0.75); // 1 extra px is added because excact px doesnt look identical to html view
         let fontstyle = (cp_style.fontstyle === 'italic' && cp_style.fontweight === 'bold') ?
            'bolditalic' : (cp_style.fontstyle === 'italic') ? 'italic' : (cp_style.fontweight === 'bold') ? 'bold' : '';
         let fontface = cp_style.fontfamily.toLowerCase();
         pdf.setFont(fontface, fontstyle);
         pdf.setTextColor(cp.greeting.style.fontcolor);
         console.log(pdf.getFontList());
         console.log('fs ' + fontface + ' fs: ' + fontstyle);

         // pdf.text method only recognizes \r\n as linebreak when the text is splitted as substrings in an array
         let chars = cp.greeting.content.split('');
         let textline = '';
         let textarr = [];
         for (c = 0; c < chars.length; c++) {
            if (!/\n/.test(chars[c])) {
               textline += chars[c];
               if (chars.length - 1 === c) {
                  if (textline.length) {
                     textarr.push(textline);
                     textline = '';
                  }
                  break;
               }
            } else {
               if (textline.length) {
                  textarr.push(textline);
                  textline = '';
               }
               textarr.push('\r\n');
            }
         }

         pdf.text(textarr, pdf_w / 2, 30, { align: 'center', maxWidth: text_max_width, lineHeightFactor: 1.4 });


         if (dc.pages > 1 && (i + 1) < dc.pages) pdf.addPage('a5');

         if (i === dc.pages - 1) pdf.output('dataurlnewwindow');

         canv = null;
      }
   }

   document.querySelector('#mds_conv-bg').onclick = () => {
      dc_html_to_pdf(true);
   }
   document.querySelector('#mds_conv-w-bg').onclick = () => {
      dc_html_to_pdf();
   }
   console.log('Done initializing.');
});