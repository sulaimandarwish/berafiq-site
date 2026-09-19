const input=document.getElementById("fileInput");
const list=document.getElementById("fileList");
const drop=document.getElementById("dropzone");
const form=document.getElementById("rfqForm");
const status=document.getElementById("formStatus");
let files=[];

document.getElementById("year").textContent=new Date().getFullYear();

const fmt=b=>b>1048576?(b/1048576).toFixed(1)+" MB":(b/1024).toFixed(0)+" KB";

function totalBytes(){return files.reduce((n,f)=>n+f.size,0)}

function render(){
  list.innerHTML="";
  files.forEach((f,i)=>{
    const d=document.createElement("div");
    d.className="file-item";
    d.innerHTML="<span><b>"+f.name+"</b> · "+fmt(f.size)+"</span><button type=button>Remove</button>";
    d.querySelector("button").onclick=()=>{files.splice(i,1);syncInput();render()};
    list.appendChild(d);
  });
  if(files.length){
    const t=document.createElement("div");
    t.className="file-item";
    t.innerHTML="<span>Total attachments</span><b>"+fmt(totalBytes())+" / 10 MB</b>";
    list.appendChild(t);
  }
}

function syncInput(){
  const dt=new DataTransfer();
  files.forEach(f=>dt.items.add(f));
  input.files=dt.files;
}

function add(incoming){
  const next=[...files,...incoming];
  const total=next.reduce((n,f)=>n+f.size,0);
  if(total>10*1024*1024){
    status.textContent="Attachments must be 10 MB or less in total. Please remove a file or send larger files separately to hello@berafiq.com.";
    return;
  }
  files=next;
  syncInput();
  render();
  status.textContent="";
}

input.addEventListener("change",e=>{
  const incoming=[...e.target.files];
  files=[];
  add(incoming);
});

["dragenter","dragover"].forEach(x=>drop.addEventListener(x,e=>{
  e.preventDefault();
  drop.classList.add("drag");
}));
["dragleave","drop"].forEach(x=>drop.addEventListener(x,e=>{
  e.preventDefault();
  drop.classList.remove("drag");
}));
drop.addEventListener("drop",e=>add(e.dataTransfer.files));

form.addEventListener("submit",e=>{
  if(!files.length){
    e.preventDefault();
    status.textContent="Please upload at least one CAD file or drawing.";
    return;
  }
  if(totalBytes()>10*1024*1024){
    e.preventDefault();
    status.textContent="Attachments must be 10 MB or less in total.";
    return;
  }
  status.textContent="Sending your RFQ…";
  const btn=form.querySelector("button[type=submit]");
  btn.disabled=true;
  btn.textContent="Sending…";
});
