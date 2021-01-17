const WEBSOCKURL = ""

var curpos = {"x":0,"y":0};
var canvas,ctx;
var memCV,memCTX;
var strokes = [];
var brush = 0;
var brushcolor = "#000000"
var brushsize = 5;
var isdone = 1;

var scale = []

var amHost = false;
var canDraw = false;
var disableDraw = false;
var isRoomLocked = false;
var isChatLocked = false;

var savedCanvas = "";


var socket = io();

console.log("Socket io")


var roomid = "room"
var user = '';
var isresize = false;

function activate(){
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d",{preserveDrawingBuffer: true});

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  memCV = document.createElement("canvas");
  memCTX = canvas.getContext("2d",{preserveDrawingBuffer: true});
  window.addEventListener('resize', onresize);

  canvas.width = window.screen.width * window.devicePixelRatio - 425;
  canvas.height = window.screen.height * window.devicePixelRatio - 400;

  canvas.addEventListener('mousemove', draw);
  document.addEventListener('mousedown', setPosition);
  document.addEventListener('mouseenter', setPosition);
  document.addEventListener('keydown', keyDown);
  onresize();

  
  chatInput = document.getElementById("chatInput");
  chatInput.addEventListener("keydown",function(event){
    if(event && event.keyCode == 13 && event.shiftKey) {
      //chatInput.value = "";
      chatBtnClicked();
    }
  });
  
  //bad code starting here
  clearCanvas = document.getElementById("clearCanvas");
  clearCanvas.addEventListener("keydown", function(event){
    if(event)
    clearBtnClicked();
  })

  saveFile = document.getElementById("saveFile");
  saveFile.addEventListener("keydown", function(event){
    if(event)
    saveFileClicked();
  })

  document.getElementById('loading_file').addEventListener('change', fileLoad, false);

  document.getElementById('errorText').style.visibility = "hidden";
}

function clearBtnClicked(){
  if (canDraw) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit("clearCanvas",{"room":roomid})
  }
}

function saveFileClicked(){
  var image = canvas.toDataURL("image/png").replace("data:image/png;", "data:application/octet-stream;");
  
  var a = $("<a>")
    .attr("href", image)
    .attr("download", "canvas.png")
    .appendTo("body");

a[0].click();

a.remove();
}

//doesn't work lol
function fileDialogueLoad(){
  if(canDraw){
    document.getElementById('loading_file').click();
  }
}

function fileLoad(e) {
    var reader = new FileReader();
    reader.onload = function(event){
        drawImage(event.target.result)
        socket.emit("sendImage",{"room":roomid,"image":event.target.result});
    }
    reader.readAsDataURL(e.target.files[0]);     
}

//end of thing that doesn't work lol
function removeStroke(x,y){
  if(isdone == 0) return;
  isdone = 0

  canvas.width = window.innerWidth-300;
  canvas.height = window.innerHeight-50;

  var popl = [];
  for(var i=0;i<strokes.length;++i){
    
    
    //if(ctx.isPointInPath(x,y)){
    var minx = Math.min(strokes[i][2],strokes[i][4])-5;
    var maxx = Math.max(strokes[i][2],strokes[i][4])+5;

    var miny = Math.min(strokes[i][3],strokes[i][5])-5;
    var maxy = Math.max(strokes[i][3],strokes[i][5])+5;

    //console.log("A "+maxx+" B "+x+" C "+minx);
    //console.log("A "+maxy+" B "+y+" C "+miny);
    if(maxx>x && x>minx && maxy>y && y>miny){
      popl.push(i);
      strokes[i] = ["#FF0000",0,0,0,0];
      console.log("Hello: "+i)
    } else {
      ctx.beginPath();
      ctx.lineWidth = strokes[i][1];
      ctx.lineCap = 'round';
      ctx.strokeStyle = strokes[i][0];
      ctx.moveTo(strokes[i][2],strokes[i][3]);
      ctx.lineTo(strokes[i][4],strokes[i][5]);
      ctx.stroke();
      ctx.closePath();
    }
  }

  for(var i=popl.length-1;i>0;--i)
    strokes.pop(popl[0]);

  isdone = 1
}

function setPosition(e){
  //curpos.x = e.clientX;
  //curpos.y = e.clientY;

  var elementOffsets = [e.offsetX, e.offsetY];

  elementOffsets[0] = elementOffsets[0] * ctx.canvas.width / ctx.canvas.clientWidth;
  elementOffsets[1] = elementOffsets[1] * ctx.canvas.height / ctx.canvas.clientHeight;

  curpos.x = elementOffsets[0];
  curpos.y = elementOffsets[1];
}

function onresize(){

  document.getElementById('canvasDiv').setAttribute("style",`width:${window.innerWidth-400}px;height:${window.innerHeight-200}px`);

  document.getElementById('settingBox').setAttribute("style",`height:${window.innerHeight-285}px`);
}

function keyDown(e){
  if (event.isComposing || event.keyCode === 229) {
    return;
  }
  if(event.keyCode == 49){
    brush = 0;
    brushcolor = brushcolor;
    ctx.globalCompositeOperation = "source-over";  
  } else if(event.keyCode == 50){
    brush = 1;
    ctx.globalCompositeOperation = "destination-out";  
  }
}


function draw(e){
  if (canDraw && !disableDraw) {
    if(e.buttons == 1){
    ctx.beginPath();
    
    ctx.lineWidth = brushsize;
    ctx.lineCap = 'round';
    var temp;
    if(brush == 1){
      temp = "#FFFFFF";
    } else {
      temp = brushcolor;
    }
    ctx.strokeStyle = temp;

    var st = [temp,brushsize,curpos.x/scale[0],curpos.y/scale[1]];
    ctx.moveTo(curpos.x/scale[0], curpos.y/scale[1]);
    setPosition(e);
    ctx.lineTo(curpos.x/scale[0], curpos.y/scale[1]);
    st.push(curpos.x/scale[0]);
    st.push(curpos.y/scale[1]);
    
    ctx.stroke();
    strokes.push(st);

    socket.emit('draw', {"draw":st,"room":roomid});

    //ctx.drawImage(memCV,0,0);
    //drawToCanvas(curpos.x, curpos.y)
  } else if(e.buttons == 2){
    var diff = [curpos.x,curpos.y];
    setPosition(e);
    diff = [];
  }
  }
}


function drawToCanvas(x,y,x2,y2,color,width){
  ctx.beginPath();
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.moveTo(x,y);
  ctx.lineTo(x2,y2);
  strokes.push([color,width,x,y,x2,y2]);  
  ctx.stroke();
}

function setColor(hexValue) {
  brushcolor = hexValue
  document.getElementById("colorChangeText").innerHTML = hexValue
}

function setScale(brushSizeValue) {
  brushsize = brushSizeValue;
  document.getElementById("sliderChangeText").innerHTML = brushSizeValue
}

function drawImage(b64img){
  var img = new Image;

  img.onload = function(){
    ctx.drawImage(img,0,0);
  }
  img.src = b64img;
}


function enterRoom(e) {
    var codeInp = document.getElementById("roomCodeInput");
    var usernameInp = document.getElementById("usernameInput");

    if (/\S/.test(codeInp) && / \S/.test(usernameInp)) {
        roomid = codeInp.value;
        user = usernameInp.value;

        socket.emit("join", {
            "username": user,
            "room": roomid,
            "resolution": [
                canvas.width,
                canvas.height
            ]
        });

        socket.emit(
          "listPeople",
          {"roomCode":roomid}
        )

        socket.emit("requestCanvas", {
            "room": roomid
        })

        var roomdiv = document.getElementById("roomdiv")
        var overlay = document.getElementById("overlay")
        overlay.hidden = true
        roomdiv.hidden = true
        
        document.getElementById("roomCodeLabel").innerHTML = "Code: "+ `<kbd>${roomid}</kbd>`;
        return false;
    } else {
      setError("Please provide a username/room code that is not empty!")
    }
}

socket.on('connect', (asd) => {
  console.log("Connected")
});

socket.on('drawCanvas', (drawData) => {
  drawToCanvas(
    drawData[2],
    drawData[3],
    drawData[4],
    drawData[5],

    drawData[0],
    drawData[1],
  );
});



function openChatTab(){
  var chatbox = document.getElementById("chatContainer")
  var peoplebox = document.getElementById("peopleContainer")
  var settingsbox = document.getElementById("settingsContainer")
  chatbox.style.display = "block";
  peoplebox.style.display = "none";
  settingsbox.style.display = "none";

  var chatbtn = document.getElementById("openchatbtn");
  var peoplebtn = document.getElementById("openpeoplebtn");
  var settingsbtn = document.getElementById("opensettingsbtn");
  chatbtn.disabled = true;
  peoplebtn.disabled = false;
  settingsbtn.disabled = false;
}

function openPeopleTab(){
  var chatbox = document.getElementById("chatContainer")
  var peoplebox = document.getElementById("peopleContainer")
  var settingsbox = document.getElementById("settingsContainer")
  chatbox.style.display = "none";
  peoplebox.style.display = "block";
  settingsbox.style.display = "none";

  var chatbtn = document.getElementById("openchatbtn");
  var peoplebtn = document.getElementById("openpeoplebtn");
  var settingsbtn = document.getElementById("opensettingsbtn");
  chatbtn.disabled = false;
  peoplebtn.disabled = true;
  settingsbtn.disabled = false;
}

function openSettingsTab(){
  var chatbox = document.getElementById("chatContainer")
  var peoplebox = document.getElementById("peopleContainer")
  var settingsbox = document.getElementById("settingsContainer")
  chatbox.style.display = "none";
  peoplebox.style.display = "none";
  settingsbox.style.display = "block";

  var chatbtn = document.getElementById("openchatbtn");
  var peoplebtn = document.getElementById("openpeoplebtn");
  var settingsbtn = document.getElementById("opensettingsbtn");
  chatbtn.disabled = false;
  peoplebtn.disabled = false;
  settingsbtn.disabled = true;
}

function lockRoomClicked(){
  socket.emit("toggleRoomLocked",{
    "roomCode":roomid
  });
}

function lockChatClicked(){
  socket.emit("toggleChatLocked",{
    "roomCode":roomid
  });
}


// i think?
socket.on("getCanvas",function(sid){
  var b64img = canvas.toDataURL();
  socket.emit("sendCanvas",{
    "image":b64img,
    "sid":sid,
    "room":roomid
  });
});

socket.on("setHost",function(hostStatus){
  amHost = hostStatus

  if (amHost) {
    canDraw = true;
  }
});

socket.on("setDraw",function(drawStatus){
  canDraw = drawStatus
  var canDrawLabel = document.getElementById("canDrawLabel");
  if (drawStatus){
    canDrawLabel.textContent = "public"
    canDrawLabel.classList.remove("bg-danger");
    canDrawLabel.classList.add("bg-success");
  } else {
    canDrawLabel.textContent = "private"
    canDrawLabel.classList.remove("bg-success");
    canDrawLabel.classList.add("bg-danger");
  }
});

socket.on("setRoomLock",function(roomStatus){
  isRoomLocked = roomid
  var roomLockedLabel = document.getElementById("roomLockedLabel");
  if (roomStatus){
    roomLockedLabel.textContent = "locked"
    roomLockedLabel.classList.remove("bg-success");
    roomLockedLabel.classList.add("bg-danger");
  } else {
    roomLockedLabel.textContent = "unlocked"
    roomLockedLabel.classList.remove("bg-danger");
    roomLockedLabel.classList.add("bg-success");
  }
});

socket.on("setChatLock",function(chatStatus){
  isChatLocked = chatStatus
  var chatLockedLabel = document.getElementById("chatLockedLabel");
  if (chatStatus){
    chatLockedLabel.textContent = "locked"
    chatLockedLabel.classList.remove("bg-success");
    chatLockedLabel.classList.add("bg-danger");
  } else {
    chatLockedLabel.textContent = "unlocked"
    chatLockedLabel.classList.remove("bg-danger");
    chatLockedLabel.classList.add("bg-success");
  }
});

socket.on("returnPeople",function(data){
  var peopleContainer = document.getElementById("peopleContainer");
  for(var i=0;i<peopleContainer.children.length;++i){
    if(peopleContainer.children[i].id != "personTemplate")
      peopleContainer.children[i].remove()
  }

  var ppl = data["people"]
  var host = data["host"]
  console.log(ppl)

    for(var i=0;i<ppl.length;++i){
      addPerson(ppl[i],ppl[i]==host)
    }


  console.log("-- PPL --");
  console.log(ppl);
});

socket.on("pushCanvas", function(data){

  var b64img = data["image"];
  var resolution = data["resolution"];

  var img = new Image;
  
  img.onload = function(){
    scale = [1,1]
    reswidth = window.screen.width * window.devicePixelRatio - 425;
    resheight = window.screen.height * window.devicePixelRatio - 400;
    console.log(resolution[0]+", "+reswidth);
    console.log(resolution[1]+", "+resheight);
    if (resolution[0] > window.innerWidth){
      scale[0] = reswidth/resolution[0]
    }
    if (resolution[1] > window.innerHeight){
      scale[1] = resheight/resolution[1]
    }
    canvas.width = resolution[0];
    canvas.height = resolution[1];
    ctx.scale(scale[0],scale[1]);
    ctx.drawImage(
      img,
      0,0,
      img.width,
      img.height,
    );
    //ctx.drawImage(img,0,0,canvas.width,canvas.height);
  }
  img.src = b64img;

});


socket.on("msg",(msg) => {
  var chat = document.getElementById("chatBox");
  var nel = document.createElement("p");
  nel.style.backgroundColor = "#FF33FF";
  nel.textContent = msg["msg"];
  nel.style="word-wrap: break-word; line-height: 1; margin-top:5px;"
  chat.appendChild(nel);
});


socket.on("disconnect",function(){
  var chat = document.getElementById("chatBox");
  var nel = document.createElement("p");
  nel.style.backgroundColor = "#FF33FF";
  nel.textContent = "Host has shut down the server";
  nel.style="word-wrap: break-word; line-height: 1; margin-top:5px;"
  chat.appendChild(nel);
  window.location="/";
});

socket.on("errorCode",(text) => {
  setError(text);
});

function addPerson(person,isHost=false){
  console.log(addPerson.caller)
  var chat = document.getElementById("peopleContainer");
  
  
  console.log("Creating person")


      htmlTemplate = `<div id="${person}" style="border: 2px solid #2c2f33;"> <image name="personIcon" src = "https://ui-avatars.com/api/?name=${person}" style="height:50px;width:50px;display:inline-block;margin-left:5px;${(isHost)? "border: 2px solid #008000;":"border: 2px solid #C0C0C0;"}"></image><p name="personName" style="display:inline-block;margin-left:10px;">${(isHost)? person + " (Host)" : person}</p>`

      if (amHost && !isHost) {
        htmlTemplate += `<button name="personDraw" type="button" class="primary btn-circle" style="background-image: url('https://cdn4.iconfinder.com/data/icons/basic-user-interface-elements/700/edit-change-pencil-16.png');background-repeat: no-repeat;background-position: center;display:inline-block;height:25px;width:25px;margin-left:10px;padding-top:15px;position: relative;" onclick="allowUserEdit('${person}','${roomid}')"><span class="btn-overlay" style="display:none;" id="${person}-overlay"></span></button> <button name="personKick" type="button" class="primary btn-circle" style="background-image: url('https://cdn2.iconfinder.com/data/icons/business-and-education-1/512/201_Auction_gavel_hammer_judgement_law-16.png');background-repeat: no-repeat;background-position: center;display:inline-block;height:25px;width:25px;margin-left:5px;padding-top:15px;" onclick="kickUser('${person}','${roomid}')"> </button>`
      }
      htmlTemplate += "</div>"

      chat.innerHTML += htmlTemplate;
    //}
  
 
}

socket.on("newPerson", addPerson);
socket.on("delPerson",(person) => {
  document.getElementById(person).remove();
});


function setError(text) {
  errorText = document.getElementById('errorText');
  errorText.innerHTML = text;
  errorText.style.visibility = "visible";

  var roomdiv = document.getElementById("roomdiv")
  var overlay = document.getElementById("overlay")
  overlay.hidden = false
  roomdiv.hidden = false
}


function chatBtnClicked(){
  var msgInp = document.getElementById("chatInput");
  if (msgInp.value) {
      var msg = msgInp.value;
      socket.emit("chatMsg",{
        "msg":msg,
        "room":roomid
      });
      msgInp.value = '';
  }
}

function allowUserEdit(person,roomid) {
  console.log(person)

  var overlay = document.getElementById(`${person}-overlay`)

  if (overlay.style.display === "none") {
    overlay.style.display = "block";
  } else {
    overlay.style.display = "none";
  }

  socket.emit(
    "toggleDraw",
    {"username":person,"roomCode":roomid},
  )
}

function kickUser(person, roomid) {
  socket.emit(
            "kickPerson",
            {
              "username":person,
              "roomCode":roomid
            },
          )  
}

function saveBtnClicked() {
  savedCanvas = canvas.toDataURL();
}

function loadBtnClicked() {
  drawImage(savedCanvas);
  socket.emit("sendImage",{"room":roomid,"image":savedCanvas});
}

socket.on("drawPicture", pictureData => {
  var img = new Image();
  img.onload = function(){
    ctx.drawImage(img,0,0);
  }
  img.src = pictureData;
})

socket.on("clearCanvas",() => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
})
function setDraw(){
  brush = 0
}
function setErase(){
  brush = 1
}