window.addEventListener('load', () => {
   if (!/\/wp-admin\/upload\.php*/.test(window.location.pathname)) return;

   let form = document.querySelector('#mds_del-motive-form');
   let submit = form.querySelector('input[type=submit]');
   let status_text = form.querySelector('#mds_status-bar-motives p');
   let delete_all_choice = form.querySelector('#mds_status-bar-motives div');

   // let user select all motives at once
   function select_all_motives() {
      form.querySelectorAll('input[type=checkbox]').forEach(e => e.checked = true);
      show_del_btn_if_imgs_are_selected(); // update programatically
   }

   delete_all_choice.onclick = select_all_motives;

   // display delete button with amount of currently selected motives to delete
   function show_del_btn_if_imgs_are_selected() {

      let imgs_to_del = 0;

      form.querySelectorAll('input[type=checkbox]').forEach((e) => {
         if (e.checked) imgs_to_del++;
      });

      if (imgs_to_del) {

         delete_all_choice.style.display = 'block';
         if (imgs_to_del === document.querySelectorAll('input[type=checkbox]').length) {
            delete_all_choice.textContent = 'Alle valgt';
         }

         submit.style.display = 'block';
         status_text.style.display = 'none';
         (imgs_to_del === 1) ? submit.value = 'Slett bilde (1)' : submit.value = 'Slett bilder (' + imgs_to_del + ')';
      } else {
         delete_all_choice.style.display = 'none';
         delete_all_choice.textContent = 'Velg alle';
         submit.style.display = 'none';
         status_text.textContent = 'Velg bilder for å slette';
         status_text.style.display = 'block';
      }
   }

   form.onchange = show_del_btn_if_imgs_are_selected;

   form.querySelectorAll('.mds_motive-select-box').forEach((e) => {
      e.onclick = (t) => {
         let input = t.currentTarget.querySelector('input[type=checkbox]');
         (input.checked) ? input.checked = false : input.checked = true;
         show_del_btn_if_imgs_are_selected();
      }
   });

});