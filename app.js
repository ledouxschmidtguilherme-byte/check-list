(() => {
  const $ = id => document.getElementById(id);
  const KEY = "checklist-fotografico-v1";
  let data = { lists: [], currentId: null };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
  const today = () => new Date().toISOString().slice(0,10);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function load() {
    try { const saved = JSON.parse(localStorage.getItem(KEY) || "null"); if (saved && Array.isArray(saved.lists)) data = saved; }
    catch (_) {}
    if (!data.lists.length) createList(false);
    if (!data.currentId || !data.lists.some(x => x.id === data.currentId)) data.currentId = data.lists[0].id;
    save(); render();
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(data)); }
  function current() { return data.lists.find(x => x.id === data.currentId); }
  function createList(ask=true) {
    const item = { id: uid(), title: ask ? "Novo checklist" : "Meu primeiro checklist", place:"", owner:"", date:today(), items:[] };
    data.lists.unshift(item); data.currentId = item.id; save(); render();
    if (ask) { $("title").focus(); $("title").select(); }
  }
  function render() {
    const picker = $("listPicker");
    picker.innerHTML = data.lists.map(x => `<option value="${esc(x.id)}">${esc(x.title || "Checklist sem título")}</option>`).join("");
    picker.value = data.currentId;
    const c = current(); if (!c) return;
    $("title").value = c.title || ""; $("place").value = c.place || "";
    $("owner").value = c.owner || ""; $("date").value = c.date || today();
    $("count").textContent = `${c.items.length} ${c.items.length === 1 ? "item" : "itens"}`;
    $("items").innerHTML = c.items.map((it, i) => itemHTML(it, i)).join("");
  }
  function itemHTML(it, i) {
    const photo = (key, label) => `<div class="photo"><strong>${label}</strong>${it[key] ? `<img src="${it[key]}" alt="${label}">` : `<div class="placeholder">Nenhuma foto</div>`}<input type="file" accept="image/*" capture="environment" id="file-${i}-${key}" data-index="${i}" data-key="${key}"><label for="file-${i}-${key}">📷 ${it[key] ? "Trocar foto" : "Adicionar foto"}</label>${it[key] ? `<button type="button" data-remove="${key}" data-index="${i}">Remover</button>` : ""}</div>`;
    return `<article class="item" data-item="${i}"><div class="itemtop"><strong>Item ${i+1}</strong><button type="button" class="danger" data-delete="${i}">Excluir</button></div><label>Descrição</label><input data-field="name" data-index="${i}" value="${esc(it.name)}" placeholder="O que será verificado?"><label>Observações</label><textarea data-field="notes" data-index="${i}" placeholder="Descreva a situação...">${esc(it.notes)}</textarea><div class="photos">${photo("before","Antes")}${photo("after","Depois")}</div></article>`;
  }
  function updateGeneral() {
    const c = current(); if (!c) return;
    c.title=$("title").value; c.place=$("place").value; c.owner=$("owner").value; c.date=$("date").value;
    const opt = $("listPicker").selectedOptions[0]; if (opt) opt.textContent = c.title || "Checklist sem título";
    save();
  }
  ["title","place","owner","date"].forEach(id => $(id).addEventListener("input", updateGeneral));
  $("listPicker").addEventListener("change", e => { data.currentId=e.target.value; save(); render(); });
  $("newList").addEventListener("click", () => createList());
  $("deleteList").addEventListener("click", () => {
    if (data.lists.length === 1) { alert("Mantenha pelo menos um checklist."); return; }
    if (!confirm("Excluir este checklist e todas as suas fotos?")) return;
    data.lists=data.lists.filter(x=>x.id!==data.currentId); data.currentId=data.lists[0].id; save(); render();
  });
  $("addItem").addEventListener("click", () => { current().items.push({name:"",notes:"",before:null,after:null}); save(); render(); });
  $("items").addEventListener("input", e => {
    const field=e.target.dataset.field; if (!field) return;
    current().items[Number(e.target.dataset.index)][field]=e.target.value; save();
  });
  $("items").addEventListener("change", e => {
    if (e.target.matches('input[type="file"]')) {
      const file=e.target.files && e.target.files[0]; if (!file) return;
      if (!file.type.startsWith("image/")) { alert("Escolha uma imagem."); return; }
      const reader=new FileReader();
      reader.onload=() => {
        const idx=Number(e.target.dataset.index), key=e.target.dataset.key;
        current().items[idx][key]=reader.result; save(); render();
      };
      reader.readAsDataURL(file);
    }
  });
  $("items").addEventListener("click", e => {
    const del=e.target.dataset.delete, rem=e.target.dataset.remove;
    if (del !== undefined) { current().items.splice(Number(del),1); save(); render(); }
    if (rem) { current().items[Number(e.target.dataset.index)][rem]=null; save(); render(); }
  });
  $("pdf").addEventListener("click", () => { updateGeneral(); window.print(); });
  $("backup").addEventListener("click", () => {
    updateGeneral();
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="backup-checklist-fotografico.json"; a.click(); URL.revokeObjectURL(a.href);
    status("Backup salvo. Guarde o arquivo em um local seguro.");
  });
  $("restore").addEventListener("change", e => {
    const file=e.target.files && e.target.files[0]; if (!file) return;
    const reader=new FileReader();
    reader.onload=() => {
      try {
        const imported=JSON.parse(reader.result);
        if (!imported || !Array.isArray(imported.lists)) throw new Error();
        if (!confirm("Importar este backup? Os checklists atuais serão substituídos.")) return;
        data=imported; if (!data.lists.length) createList(false); data.currentId=data.currentId || data.lists[0].id;
        save(); render(); status("Backup importado com sucesso.");
      } catch (_) { alert("Não foi possível importar. Verifique se o arquivo é um backup válido."); }
      e.target.value="";
    };
    reader.readAsText(file);
  });
  function status(msg) { $("status").textContent=msg; }
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  }
  load();
})();
