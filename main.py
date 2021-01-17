from flask import Flask, send_file, request
from flask_socketio import SocketIO,join_room, leave_room, emit, close_room, disconnect
import re

rooms = {

}

users = {

}

class User:
  def __init__(self, canDraw = False, host = False, client = "",username="Placeholder",roomCode=0): 
         self.host = host
         self.client = client
         self.canDraw = canDraw
         self.username = username
         self.roomCode = roomCode
  
  def givePermission(self):
    self.canDraw = True

  def revokePermission(self):
    self.canDraw = False

  
  

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app,cors_allowed_origins="*")


@app.route('/')
@app.route('/index')
@app.route('/index.html')  
def home():  
    return send_file('website/index.html', cache_timeout=0)

@app.route('/script.js')
def script():
  return send_file('website/script.js', cache_timeout=0)

@app.route('/style.css')
def css():
  return send_file('website/style.css', cache_timeout=0)

@app.route('/logo.png')
def logo():
  return send_file('logo.png', cache_timeout=0)

# ?
@socketio.on('json')
def handle_json(json):
    print('received json: ' + str(json))

# ??
@socketio.on('clientDraw')
def handle_my_custom_event(json):
    print('received json: ' + str(json))



@socketio.on('join')
def on_join(data):
    username = str(data['username'])

    username = re.sub(r"[^a-zA-Z0-9]+", '', username)

    room = str(data['room'])
    
    if (not username.isspace() and not room.isspace()):
      if rooms.get(room) and rooms[room]["locked"]:
        emit("errorCode","Room is locked",room=request.sid)
        return
      
      if (rooms.get(room)):
        filterUser = list(filter(lambda x: (x.username == username), rooms[room]["users"]))
        if (len(filterUser) >0):
          emit("errorCode","Duplicate username!",room=request.sid)
          return
          
      join_room(room)
      userJoinRoom(data,request.sid)

      emit("msg",{"msg":username + ' has entered the room.'}, room=room)
      
      emit(
        "newPerson",
        username, 
        room=room
      )
    else:
      emit("errorCode","Please provide a username/room code that is not empty!",room=request.sid)

# on disconnecting
@socketio.on('disconnect')
def on_disconnecting():
  user_sid = request.sid
  print(user_sid)
  print("user disconnecting")
  print(users)
  if (user_sid in users):
    roomCode = users[user_sid].roomCode
    username = users[user_sid].username

    emit(
      "msg",
      {"msg":username + ' left the room.'},
      room=roomCode
    )

    emit(
        "delPerson",
        username, 
        room=roomCode
      )

    leave_room(roomCode)
    deletedRoom = False
    
  
    if users[user_sid].host:
      close_room(roomCode)

      for user in rooms[roomCode]["users"]:
        print(user.username)
        disconnect(sid=user.client)

      del rooms[roomCode]
      deletedRoom = True
      

    
    if (not deletedRoom):
      rooms[roomCode]["users"].remove(users[user_sid])
    del users[user_sid]
    
    
    
    

# draw
@socketio.on('draw')
def draw(data):
  drawData = data["draw"]
  roomCode = data["room"]
  if (roomCode in rooms):
    filterUser = list(filter(lambda x: (x.client == request.sid), rooms[roomCode]["users"]))

    if (len(filterUser) != 0 and filterUser[0].canDraw):
      emit('drawCanvas', drawData, room=roomCode)

# request canvas
@socketio.on('requestCanvas')
def requestCanvas(data):
  #print("big reqest")
  roomCode = data["room"]
  if (roomCode in rooms):
    #print("smaller request")
    filterUser = list(filter(lambda x: (x.host), rooms[roomCode]["users"]))
    
    if (len(filterUser) != 0):
      #print("HELP ME PLEASE")
      #print(filterUser[0].username,":::",filterUser[0].client)
      print("test")
      emit(
        'getCanvas', 
        request.sid,
        room=filterUser[0].client
      )
      
# send canvas
@socketio.on('sendCanvas')
def sendCanvas(data):
  userSid = data["sid"]
  roomCode = data["room"]
  image = data["image"]

  if (roomCode in rooms):
    filterUser = list(filter(lambda x: (x.client == userSid), rooms[roomCode]["users"]))

    if (len(filterUser) != 0):
      emit('pushCanvas', {
        "image":image,
        "resolution":rooms[roomCode]["resolution"],
      }, room=userSid)

@socketio.on('sendImage')
def sendImage(data):
  userSid = request.sid
  roomCode = data["room"]
  image = data["image"]

  if (roomCode in rooms):
    filterUser = list(filter(lambda x: (x.client == userSid), rooms[roomCode]["users"]))

    if (len(filterUser) != 0 and filterUser[0].canDraw):
      print("Images sent to client")
      emit('drawPicture', image, room=roomCode)

# chat msg
@socketio.on("chatMsg")
def chatMsg(data):
  roomCode = data["room"]
  msg = data["msg"]
  
  if (roomCode in rooms and msg != ""):
    filterUser = list(filter(lambda x: (x.client == request.sid), rooms[roomCode]["users"]))

    if (len(filterUser) != 0):
      if (filterUser[0].host and rooms[roomCode]["chat_locked"]) or not rooms[roomCode]["chat_locked"]:
       emit("msg",{"msg":f"<{filterUser[0].username}> {msg}"}, room=filterUser[0].roomCode)
      else:
        emit("msg",{"msg":"Chat is locked"}, room=filterUser[0].client)


@socketio.on("toggleDraw")
def toggleDraw(data):
  username = data["username"];
  roomCode = data["roomCode"]; 
  print("toggling draw",username,roomCode)
  if (roomCode in rooms):
    filterUser = list(filter(lambda x: (x.client == request.sid), rooms[roomCode]["users"]))

    if len(filterUser) != 0 and filterUser[0].host:
      for i in users:
        if users[i].username == username:
          if users[i].canDraw:
            users[i].revokePermission()
          else:
            users[i].givePermission()
          emit("setDraw",users[i].canDraw,room=users[i].client)
          break;


@socketio.on("kickPerson")
def kickPerson(data):
  print("kick",data)
  username = data["username"];
  roomCode = data["roomCode"]; 

  if (roomCode in rooms):
    filterUser = list(filter(lambda x: (x.client == request.sid), rooms[roomCode]["users"]))

    if len(filterUser) != 0 and filterUser[0].host:
      for i in users:
        if users[i].username == username:
          disconnect(sid=i)
          break


@socketio.on("listPeople")
def listPeople(data):
  roomCode = data["roomCode"]; 

  if (roomCode in rooms):
    filterUser = list(filter(lambda x: (x.client == request.sid), rooms[roomCode]["users"]))

    if len(filterUser) != 0:
      ppl = []
      host = ""
      for i in rooms[roomCode]["users"]:
        ppl.append(i.username)
        if i.host:
          host = i.username
      emit(
        "returnPeople",{
          "people":ppl,
          "host":host},
        room=request.sid)

@socketio.on("toggleRoomLocked")
def toggleRoomLocked(data):
  roomCode = data["roomCode"]; 
  print("locking room")
  if (roomCode in rooms):
    filterUser = list(filter(lambda x: (x.client == request.sid), rooms[roomCode]["users"]))

    if len(filterUser) != 0 and filterUser[0].host:
      print("locking room for real")
      rooms[roomCode]["locked"] = not rooms[roomCode]["locked"]
      emit(
        "setRoomLock",
        rooms[roomCode]["locked"],
        room=roomCode
      )

@socketio.on("toggleChatLocked")
def toggleChatLocked(data):
  roomCode = data["roomCode"]; 
  print("locking room")
  if (roomCode in rooms):
    filterUser = list(filter(lambda x: (x.client == request.sid), rooms[roomCode]["users"]))

    if len(filterUser) != 0 and filterUser[0].host:
      print("locking room for real")
      rooms[roomCode]["chat_locked"] = not rooms[roomCode]["chat_locked"]
      emit(
        "setChatLock",
        rooms[roomCode]["chat_locked"],
        room=roomCode
      )

@socketio.on('connect')
def connect():
  print("User connected")

@socketio.on('clearCanvas')
def clearCanvas(data):
  userSid = request.sid
  roomCode = data["room"]

  if (roomCode in rooms):
    filterUser = list(filter(lambda x: (x.client == userSid), rooms[roomCode]["users"]))

    if (len(filterUser) != 0 and filterUser[0].canDraw):
      emit('clearCanvas', room=roomCode)



def userJoinRoom(clientData,client):
  clientRoom = clientData["room"]
  username = clientData["username"]
  if (clientData["room"] in rooms):
    newuser = User(client=client,username=username,roomCode=clientRoom)
    users[client] = newuser
    rooms[clientRoom]["users"].append(newuser)
  else:
    rooms[clientRoom] = {
      "host":client,
      "resolution":clientData["resolution"],
      "locked":False,
      "chat_locked":False,
      "users":[]
    };
    print("client ",client)
    newuser = User(canDraw=True,host=True,client=client,username=username,roomCode=clientRoom)
    users[client] = newuser
    rooms[clientRoom]["users"].append(newuser)
    emit("setHost",True,room=client)
    emit("setDraw",True,room=client)

print("Running")

socketio.run(app,host="0.0.0.0")
app.run(host='0.0.0.0')