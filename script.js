document.addEventListener("DOMContentLoaded", function () {

function formatDate(value) {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length !== 3) return "";
  const date = new Date(Number(parts[0]), Number(parts[1])-1, Number(parts[2]));
  return date.toLocaleDateString("fr-BE",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
}

function capitalizeFirst(text) {
  return text ? text.charAt(0).toUpperCase()+text.slice(1) : "";
}

function waitForImages(container) {
  return Promise.all(Array.from(container.querySelectorAll("img")).map(function(img) {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise(function(resolve) {
      img.addEventListener("load",resolve,{once:true});
      img.addEventListener("error",resolve,{once:true});
    });
  }));
}

function canvasToBlob(canvas) {
  return new Promise(function(resolve,reject) {
    try {
      canvas.toBlob(function(blob) {
        blob ? resolve(blob) : reject(new Error("Le navigateur n'a pas pu créer le PNG."));
      },"image/png",1);
    } catch(error) { reject(error); }
  });
}

async function exportCard(card,filename,button) {
  button.disabled=true;
  button.textContent="⏳ Génération...";
  try {
    if (typeof html2canvas !== "function") throw new Error("html2canvas n'est pas chargé.");
    await waitForImages(card);
    await new Promise(r=>setTimeout(r,200));
    let canvas,blob;
    try {
      canvas=await html2canvas(card,{backgroundColor:"#ffffff",scale:2,useCORS:false,allowTaint:false,logging:false,imageTimeout:0,removeContainer:true});
      blob=await canvasToBlob(canvas);
    } catch(firstError) {
      console.warn("Premier export impossible :",firstError);
      canvas=await html2canvas(card,{backgroundColor:"#ffffff",scale:2,useCORS:false,allowTaint:false,logging:false,imageTimeout:0,removeContainer:true,ignoreElements:function(element){
        return element.id==="logoImg" || element.id==="infoLogoImg";
      }});
      blob=await canvasToBlob(canvas);
    }
    if (!blob) throw new Error("Le PNG est vide.");
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;
    link.download=filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  } catch(error) {
    console.error("Erreur d'export :",error);
    alert("Impossible de créer l'image.\n\nErreur : "+error.message);
  }
  button.disabled=false;
  button.textContent=button.id==="exportInfoBtn" ? "📥 Télécharger l'information (PNG)" : "📥 Télécharger l'image (PNG)";
}

/* NAVIGATION */
const navDeviation=document.getElementById("navDeviation");
const navInfo=document.getElementById("navInfo");
const deviationPanel=document.getElementById("deviationPanel");
const infoPanel=document.getElementById("infoPanel");
const deviationCard=document.getElementById("deviationCard");
const infoCard=document.getElementById("infoCard");

function showDeviation() {
  navDeviation.classList.add("active"); navInfo.classList.remove("active");
  deviationPanel.classList.add("active"); infoPanel.classList.remove("active");
  deviationCard.classList.remove("hidden"); infoCard.classList.add("hidden");
}
function showInfo() {
  navInfo.classList.add("active"); navDeviation.classList.remove("active");
  infoPanel.classList.add("active"); deviationPanel.classList.remove("active");
  infoCard.classList.remove("hidden"); deviationCard.classList.add("hidden");
}
navDeviation.addEventListener("click",showDeviation);
navInfo.addEventListener("click",showInfo);

/* DÉVIATION : DATES */
const dateStart=document.getElementById("dateStart"),dateFrom=document.getElementById("dateFrom"),dateTo=document.getElementById("dateTo");
const quandText=document.getElementById("quandText"),dateSingleWrap=document.getElementById("dateSingleWrap"),dateRangeWrap=document.getElementById("dateRangeWrap");

function updateQuand() {
  const selected=document.querySelector('input[name="dateMode"]:checked');
  if (!selected) return;
  if(selected.value==="single") {
    const date=formatDate(dateStart.value);
    quandText.textContent=date ? "À partir du "+date+"." : "À partir du mercredi jour mois année.";
  } else {
    const from=formatDate(dateFrom.value),to=formatDate(dateTo.value);
    if(from&&to) quandText.textContent="Du "+from+" au "+to+".";
    else if(from) quandText.textContent="À partir du "+from+".";
    else if(to) quandText.textContent="Jusqu’au "+to+".";
    else quandText.textContent="Du jour mois année au jour mois année.";
  }
}
document.querySelectorAll('input[name="dateMode"]').forEach(radio=>radio.addEventListener("change",function(){
  if(this.value==="range"){dateSingleWrap.classList.remove("active");dateRangeWrap.classList.add("active");}
  else{dateRangeWrap.classList.remove("active");dateSingleWrap.classList.add("active");}
  updateQuand();
}));
[dateStart,dateFrom,dateTo].forEach(input=>{input.addEventListener("change",updateQuand);input.addEventListener("input",updateQuand);});
document.getElementById("applyDates").addEventListener("click",updateQuand);
updateQuand();

/* DÉVIATION : ARRÊTS */
const stopsRemoved=document.getElementById("stopsRemoved"),stopsReplacement=document.getElementById("stopsReplacement");
const stopsRemovedList=document.getElementById("stopsRemovedList"),stopsReplacementText=document.getElementById("stopsReplacementText");
const removedBox=document.getElementById("removedBox"),replacementBox=document.getElementById("replacementBox");

function updateStops() {
  const removedLines=stopsRemoved.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  stopsRemovedList.innerHTML="";
  if(removedLines.length){removedLines.forEach(name=>{const li=document.createElement("li");li.textContent=name;stopsRemovedList.appendChild(li);});removedBox.style.display="block";}
  else removedBox.style.display="none";
  const replacementLines=stopsReplacement.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  stopsReplacementText.innerHTML="";
  if(replacementLines.length){
    replacementLines.forEach((name,index)=>{const span=document.createElement("span");span.textContent=name;stopsReplacementText.appendChild(span);if(index<replacementLines.length-1)stopsReplacementText.appendChild(document.createElement("br"));});
    replacementBox.style.display="block";
  } else replacementBox.style.display="none";
}
stopsRemoved.addEventListener("input",updateStops);
stopsReplacement.addEventListener("input",updateStops);
updateStops();

/* DÉVIATION : LIGNES */
const lineInput=document.getElementById("lineInput"),addLineBtn=document.getElementById("addLineBtn"),lineChips=document.getElementById("lineChips"),lineBadges=document.getElementById("lineBadges"),ligneLabel=document.getElementById("ligneLabel");
let lines=["12"];

function renderLines() {
  lineChips.innerHTML="";lineBadges.innerHTML="";
  lines.forEach((name,index)=>{
    const chip=document.createElement("span");chip.className="chip";chip.textContent=name;
    const remove=document.createElement("button");remove.type="button";remove.textContent="×";
    remove.addEventListener("click",()=>{lines.splice(index,1);renderLines();});
    chip.appendChild(remove);lineChips.appendChild(chip);
    const badge=document.createElement("span");badge.className="badge";badge.textContent=name;lineBadges.appendChild(badge);
  });
  ligneLabel.textContent=lines.length>1?"Lignes":"Ligne";
}
function addLines() {
  lineInput.value.split(/[\s,;+/]+/).map(x=>x.trim()).filter(Boolean).forEach(value=>{
    if(!lines.some(l=>l.toLowerCase()===value.toLowerCase())) lines.push(value);
  });
  lineInput.value="";lineInput.focus();renderLines();
}
addLineBtn.addEventListener("click",addLines);
lineInput.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addLines();}});
renderLines();

/* RÉSEAU */
function getNetworkData(network) {
  if(network==="LETEC") return {url:"https://www.letec.be/",name:"letec.be",phone:"078 05 31 00"};
  if(network==="De Lijn") return {url:"https://www.delijn.be/",name:"delijn.be",phone:"070 220 200"};
  if(network==="STIB") return {url:"https://www.stib-mivb.be/",name:"stib-mivb.be",phone:"070 23 20 00"};
  return {url:"https://www.belgiantrain.be/",name:"belgiantrain.be",phone:"02 528 28 28"};
}
const networkSelect=document.getElementById("network"),networkText=document.getElementById("networkText"),contactLink=document.getElementById("contactLink"),contactPhone=document.getElementById("contactPhone");
function updateNetwork() {
  const data=getNetworkData(networkSelect.value);
  networkText.textContent=networkSelect.value;
  contactLink.innerHTML='<a href="'+data.url+'" target="_blank">'+data.name+"</a>";
  contactPhone.textContent=data.phone;
}
networkSelect.addEventListener("change",updateNetwork);updateNetwork();

/* CARTE */
const mapFile=document.getElementById("mapFile"),mapWrap=document.getElementById("mapWrap"),mapImg=document.getElementById("mapImg"),removeMap=document.getElementById("removeMap");
mapFile.addEventListener("change",function(){
  const file=this.files&&this.files[0];if(!file)return;
  if(!file.type.startsWith("image/")){alert("Veuillez sélectionner une image.");this.value="";return;}
  const reader=new FileReader();
  reader.onload=e=>{mapImg.onload=()=>{mapWrap.style.display="block";removeMap.style.display="block";};mapImg.src=e.target.result;};
  reader.onerror=()=>{alert("Impossible de lire cette image.");mapFile.value="";};
  reader.readAsDataURL(file);
});
removeMap.addEventListener("click",()=>{mapImg.removeAttribute("src");mapWrap.style.display="none";removeMap.style.display="none";mapFile.value="";});

/* INFORMATIONS : LIGNES */
const infoLineInput=document.getElementById("infoLineInput"),infoAddLineBtn=document.getElementById("infoAddLineBtn"),infoLineChips=document.getElementById("infoLineChips"),infoLineBadges=document.getElementById("infoLineBadges"),infoLigneLabel=document.getElementById("infoLigneLabel");
let infoLines=[];
function renderInfoLines() {
  infoLineChips.innerHTML="";infoLineBadges.innerHTML="";
  infoLines.forEach((name,index)=>{
    const chip=document.createElement("span");chip.className="chip";chip.textContent=name;
    const remove=document.createElement("button");remove.type="button";remove.textContent="×";
    remove.addEventListener("click",()=>{infoLines.splice(index,1);renderInfoLines();});
    chip.appendChild(remove);infoLineChips.appendChild(chip);
    const badge=document.createElement("span");badge.className="badge";badge.textContent=name;infoLineBadges.appendChild(badge);
  });
  infoLigneLabel.textContent=infoLines.length? (infoLines.length>1?"Lignes":"Ligne") : "Réseau";
}
function addInfoLines() {
  infoLineInput.value.split(/[\s,;+/]+/).map(x=>x.trim()).filter(Boolean).forEach(value=>{
    if(!infoLines.some(l=>l.toLowerCase()===value.toLowerCase())) infoLines.push(value);
  });
  infoLineInput.value="";infoLineInput.focus();renderInfoLines();
}
infoAddLineBtn.addEventListener("click",addInfoLines);
infoLineInput.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addInfoLines();}});
renderInfoLines();

/* INFORMATIONS : DATES */
const infoDateSingleWrap=document.getElementById("infoDateSingleWrap"),infoDateRangeWrap=document.getElementById("infoDateRangeWrap"),infoDateTwoWrap=document.getElementById("infoDateTwoWrap");
const infoDateSingle=document.getElementById("infoDateSingle"),infoDateFrom=document.getElementById("infoDateFrom"),infoDateTo=document.getElementById("infoDateTo"),infoDateOne=document.getElementById("infoDateOne"),infoDateTwo=document.getElementById("infoDateTwo"),infoCardDate=document.getElementById("infoCardDate");

function updateInfoDate() {
  const selected=document.querySelector('input[name="infoDateMode"]:checked');if(!selected)return;
  if(selected.value==="single"){
    const date=formatDate(infoDateSingle.value);infoCardDate.textContent=date?capitalizeFirst(date)+".":"Date de l'information.";
  } else if(selected.value==="range"){
    const from=formatDate(infoDateFrom.value),to=formatDate(infoDateTo.value);
    infoCardDate.textContent=from&&to?"Du "+from+" au "+to+".":"Du jour mois année au jour mois année.";
  } else {
    const one=formatDate(infoDateOne.value),two=formatDate(infoDateTwo.value);
    if(one&&two)infoCardDate.textContent=capitalizeFirst(one)+" et "+two+".";
    else if(one)infoCardDate.textContent=capitalizeFirst(one)+".";
    else if(two)infoCardDate.textContent=capitalizeFirst(two)+".";
    else infoCardDate.textContent="Jour mois année et jour mois année.";
  }
}
document.querySelectorAll('input[name="infoDateMode"]').forEach(radio=>radio.addEventListener("change",function(){
  infoDateSingleWrap.classList.remove("active");infoDateRangeWrap.classList.remove("active");infoDateTwoWrap.classList.remove("active");
  if(this.value==="single")infoDateSingleWrap.classList.add("active");
  else if(this.value==="range")infoDateRangeWrap.classList.add("active");
  else infoDateTwoWrap.classList.add("active");
  updateInfoDate();
}));
[infoDateSingle,infoDateFrom,infoDateTo,infoDateOne,infoDateTwo].forEach(input=>{input.addEventListener("change",updateInfoDate);input.addEventListener("input",updateInfoDate);});
document.getElementById("applyInfoDates").addEventListener("click",updateInfoDate);updateInfoDate();

/* INFORMATIONS : CONTENU */
const infoTitleInput=document.getElementById("infoTitleInput"),infoPlaceInput=document.getElementById("infoPlaceInput"),infoDescriptionInput=document.getElementById("infoDescriptionInput"),infoExtraInput=document.getElementById("infoExtraInput");
const infoCardTitle=document.getElementById("infoCardTitle"),infoCardPlace=document.getElementById("infoCardPlace"),infoDescriptionBox=document.getElementById("infoDescriptionBox"),infoExtra=document.getElementById("infoExtra"),infoExtraBox=document.getElementById("infoExtraBox");
infoTitleInput.addEventListener("input",()=>infoCardTitle.textContent=infoTitleInput.value||"INFORMATION");
infoPlaceInput.addEventListener("input",()=>infoCardPlace.textContent=infoPlaceInput.value||"Belgique");
infoDescriptionInput.addEventListener("input",()=>infoDescriptionBox.textContent=infoDescriptionInput.value||"Informations à communiquer.");
infoExtraInput.addEventListener("input",()=>{if(infoExtraInput.value.trim()){infoExtra.style.display="block";infoExtraBox.textContent=infoExtraInput.value;}else{infoExtra.style.display="none";infoExtraBox.textContent="";}});

/* INFORMATIONS : RÉSEAU */
const infoNetworkSelect=document.getElementById("infoNetwork"),infoNetworkText=document.getElementById("infoNetworkText"),infoContactLink=document.getElementById("infoContactLink"),infoContactPhone=document.getElementById("infoContactPhone");
function updateInfoNetwork(){
  const data=getNetworkData(infoNetworkSelect.value);
  infoNetworkText.textContent=infoNetworkSelect.value;
  infoContactLink.innerHTML='<a href="'+data.url+'" target="_blank">'+data.name+"</a>";
  infoContactPhone.textContent=data.phone;
}
infoNetworkSelect.addEventListener("change",updateInfoNetwork);updateInfoNetwork();

/* INFORMATIONS : IMAGES */
const infoImagesInput=document.getElementById("infoImagesInput"),infoImages=document.getElementById("infoImages"),removeInfoImages=document.getElementById("removeInfoImages");
let infoImageData=[];
function renderInfoImages(){
  infoImages.innerHTML="";
  if(!infoImageData.length){infoImages.style.display="none";removeInfoImages.style.display="none";return;}
  infoImageData.forEach(src=>{const img=document.createElement("img");img.className="info-image";img.src=src;img.alt="Image d'information";infoImages.appendChild(img);});
  infoImages.style.display="block";removeInfoImages.style.display="block";
}
infoImagesInput.addEventListener("change",function(){
  const files=Array.from(this.files||[]).filter(file=>file.type.startsWith("image/"));
  infoImageData=[];let loaded=0;
  if(!files.length){this.value="";return;}
  files.forEach(file=>{const reader=new FileReader();reader.onload=e=>{infoImageData.push(e.target.result);loaded++;if(loaded===files.length)renderInfoImages();};reader.readAsDataURL(file);});
});
removeInfoImages.addEventListener("click",()=>{infoImageData=[];infoImages.innerHTML="";infoImages.style.display="none";removeInfoImages.style.display="none";infoImagesInput.value="";});

/* LOGOS */
["logoImg","infoLogoImg"].forEach(id=>{
  const img=document.getElementById(id),missing=document.getElementById(id==="logoImg"?"logoMissing":"infoLogoMissing");
  img.addEventListener("error",()=>{img.style.display="none";missing.style.display="block";});
  img.addEventListener("load",()=>{img.style.display="inline-block";missing.style.display="none";});
});

/* EXPORT */
document.getElementById("exportBtn").addEventListener("click",()=>exportCard(deviationCard,"information-trafic.png",document.getElementById("exportBtn")));
document.getElementById("exportInfoBtn").addEventListener("click",()=>exportCard(infoCard,"information-letec.png",document.getElementById("exportInfoBtn")));

});
