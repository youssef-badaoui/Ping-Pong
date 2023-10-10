import { JwtService } from '@nestjs/jwt';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody , ConnectedSocket} from '@nestjs/websockets';
import { log } from 'console';
import { Server, Socket } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';


class Player {
  username:string;
  userid: string;
  avatar: string;
  score: number;
  socketid: string;
  side: string;
  bar : bar;
  match : Match;
  opponent: Player;
  opponent_bar: number;
  isready = false;
  isposed = false;
  isquit = false;
  isongame = false;
  socket: Socket;

  constructor(socketid: string) {
    this.score = 0;
    this.socketid = socketid;
    this.opponent_bar = 0;
    this.bar = new bar();
  }
}

class Ball  {
  x : number;
  y: number;
  addx: number;
  addy: number;
  width: number;
  constructor()
  {
    this.x = 0;
    this.y = 0;
    this.addx = 1;
    this.addy = 1;
    this.width = 10;
  }
};

class canvas  {
  width:number;
  height:number;
  constructor(width:number, height:number)
  {
    this.width = width;
    this.height = height;
  }
}

class Match {
  rightplayer: Player;
  leftplayer: Player;
  ball: Ball;
  canvas: canvas;
  ingame = false;

  constructor(player1: Player, player2: Player, canvas: canvas) {
    this.rightplayer = player1;
    this.leftplayer = player2;
    this.ball = new Ball();
    this.canvas = canvas; 
  }
}

class bar{
  x:number;
  y:number;
  starty:number;
  width:number;
  length: number;
  
  constructor()
  {
    this.x = 0;
    this.y = 0;
    this.starty = 0;
    this.width = 0;
    this.length = 0;
  }
}

class Queue {
  private items: Player[] = [];

  enqueue(item: Player): void {
    this.items.push(item);
  }

  dequeue(): Player | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  peek(): Player | undefined {
    return this.items[0];
  }

  removeBySocketId(socketId: string): void {
    const indexToRemove = this.items.findIndex((player) => player.socketid === socketId);
    if (indexToRemove !== -1) {
      this.items.splice(indexToRemove, 1);
    }
  }
}

function updateballxy(match:Match) : string 
{
  if(match.ingame == false)
    return 'ok';
  if (match.ball.x + match.ball.addx > match.canvas.width)
  {
    match.leftplayer.score++;
    if(match.leftplayer.score == 4)
    {
      match.ingame = false;
      return('left win');
    }
    match.ball.x = match.canvas.width/2;
    match.ball.y = match.canvas.height/2;
  }
  else if(match.ball.x + match.ball.addx < 0)
  {
    match.rightplayer.score++;
    if(match.rightplayer.score == 4)
    {
      match.ingame = false;
      return('right win');
    }
    match.ball.x = match.canvas.width/2;
    match.ball.y = match.canvas.height/2;
  }

  if (match.ball.y + match.ball.addy > match.canvas.height || match.ball.y + match.ball.addy < 0)
    match.ball.addy = -match.ball.addy;
  if (
    match.ball.x + match.ball.width  >= match.rightplayer.bar?.x &&
    match.ball.x <= match.rightplayer.bar.x + match.rightplayer.bar.width &&
    match.ball.y > match.rightplayer.bar.starty &&
    match.ball.y < match.rightplayer.bar.starty + match.rightplayer.bar.length)
  {
    if (match.ball.addx > 0)
      match.ball.addx = -match.ball.addx;
  } else if (
    match.ball.x <= match.leftplayer.bar?.x + match.leftplayer.bar?.width + match.ball.width &&
    match.ball.x >= match.leftplayer.bar.x &&
    match.ball.y > match.leftplayer.bar.starty &&
    match.ball.y < match.leftplayer.bar.starty + match.leftplayer.bar.length
  ) {
    if (match.ball.addx < 0)
      match.ball.addx = -match.ball.addx;
  }

  match.ball.x = match.ball.x + match.ball.addx;
  match.ball.y = match.ball.y + match.ball.addy;
  return 'ok'
}

@WebSocketGateway({namespace:"matching"})
export class GameGateway{
  @WebSocketServer()
  server: Server;
  
  private waiting_users: Queue = new Queue;
  private matchs: Match[] = [];
  private playing_users: Player[] = []
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  async handleConnection(client: Socket) {
    try{      
      const payload = await this.jwtService.verifyAsync(
        client.handshake.auth.token,
        {
          secret: process.env.JWT_SECRET,
        },
    );
    if (!payload) return client.disconnect(true);
    const currentUser = await this.userService.findUserById(payload.id)
    const socketId = client.id;
    const tmplayer = new Player(socketId);
    tmplayer.username = currentUser.username;
    tmplayer.avatar = currentUser.avatar;
    tmplayer.userid = currentUser.id;
    tmplayer.socket = client;
    console.log(`User connected to game gateway with ID: ${socketId}`)
    await this.check_matching(tmplayer);
  }catch(err)
  {
    return client.disconnect(true);
  }
  }

  async handleDisconnect(client: Socket) {
    const socketId = client.id;
    console.log(this.playing_users[client.id]?.match);
    if(this.playing_users[client.id] && this.playing_users[client.id].match?.ingame == true)
    {
      this.playing_users[client.id].match.ingame = false;
      console.log('yes he is in the playing users ')
      this.server.to(this.playing_users[client.id].opponent.socketid).emit('opponent quit');
      let winner = this.playing_users[client.id].opponent;
      let loser = this.playing_users[client.id];
      winner.score = 3; loser.score = 0;
      await this.update_achivements(winner, loser, true);
      this.playing_users[this.playing_users[client.id]?.opponent?.socketid] = null;
      this.playing_users[client.id]  = null;
    }
    else
    {
      console.log('no its not in playing users')
      this.waiting_users.removeBySocketId(client.id);
    }
    console.log(`User disconnected with ID: ${socketId}`);
  }

  @SubscribeMessage('bar')
 async bar(@MessageBody() bar_y: number, @ConnectedSocket() client: Socket){

    const currentPlayer = this.playing_users[client.id];

    if (currentPlayer && currentPlayer.opponent) {
      currentPlayer.opponent.opponent_bar = bar_y;
      currentPlayer.bar ? (currentPlayer.bar.starty  = bar_y) : true;
      this.server.to(client.id).emit('match frame', {
        oppy: currentPlayer.opponent_bar,
        ballx: this.matchs[client.id].ball.x,
        bally: this.matchs[client.id].ball.y,
        myscore: this.playing_users[client.id].score,
        oppscore: this.playing_users[client.id].opponent.score
      });
      let ret = await updateballxy(this.matchs[client.id]);
      if(ret != 'ok')
      {
        this.server.to(client.id).emit(ret);
        this.server.to(this.playing_users[client.id].opponent.socketid).emit(ret);
        // client.disconnect();
        // this.playing_users[client.id].opponent.socket.disconnect();
        
       let winner: Player;
       let loser: Player;
       let cleansheet = false;

       if (ret == 'right win')
       {
         winner = this.matchs[client.id].rightplayer;
         loser = this.matchs[client.id].leftplayer;
        }
        else
        {
          winner = this.matchs[client.id].leftplayer;
          loser = this.matchs[client.id].rightplayer;
        }
        if(loser.score == 0)
          cleansheet = true;
        this.update_achivements(winner, loser, cleansheet);
      }
  } else {
    console.error('Player or opponent is undefined.');
  }
}



@SubscribeMessage('init')
init(@MessageBody() data: any, @ConnectedSocket() client: Socket): void {
  const match = this.matchs[client.id];
  match.canvas.width = data.canvasw;
  match.canvas.height = data.canvash;
  match.ball.x = match.canvas.width / 2;
  match.ball.y = match.canvas.height / 2;
  if(this.playing_users[client.id].bar)
  {
    console.log('server get init')
    if(this.playing_users[client.id].side == 'right')
      this.playing_users[client.id].bar.x = match.canvas.width - 115;
    else
      this.playing_users[client.id].bar.x = 100;
    this.playing_users[client.id].bar.length = 100;
    this.playing_users[client.id].bar.width = 15;
  }
  this.playing_users[client.id].isready = true;
  if(this.playing_users[client.id].isready && this.playing_users[client.id].isready)
  {
    this.server.to(client.id).emit('start');
    this.server.to(this.playing_users[client.id].opponent.socketid).emit('start');
  }
}

private check_matching(tmplayer:Player) 
{
    if (this.waiting_users.size() != 0)
    {
      let rightplayer = tmplayer;
      let leftplayer = this.waiting_users.peek();

      rightplayer.side = 'right';
      leftplayer.side = 'left';

      this.waiting_users.dequeue();

      rightplayer.opponent = leftplayer;
      leftplayer.opponent = rightplayer;
      this.playing_users[rightplayer.socketid] = rightplayer;
      this.playing_users[leftplayer.socketid] = leftplayer;
      let tmpmatch = new Match(rightplayer, leftplayer,  new canvas(1000,600));
      this.matchs[rightplayer.socketid] = tmpmatch;
      this.matchs[leftplayer.socketid] = tmpmatch;
      tmpmatch.ingame = true;
      rightplayer.match = tmpmatch;
      leftplayer.match = tmpmatch;
      this.server.to(rightplayer.socketid).emit('matched right', 
      {
        username : leftplayer.username,
        avatar:leftplayer.avatar
      });
      this.server.to(leftplayer.socketid).emit('matched left', 
      {
        username : rightplayer.username,
        avatar:rightplayer.avatar
      });
    }else{
      this.waiting_users.enqueue(tmplayer);
    }
}

async update_achivements(winner: Player, loser: Player, cleansheet:boolean)
{
  await this.prismaService.match.create({
    data:{
      winner_id: winner.userid,
      loser_id: loser.userid,
      winner_score: winner.score,
      loser_score: loser.score
    }
  })
  await this.prismaService.achievement.update({
    where:{
      userId: winner.userid,
    },
    data:{
      firstGameAchie : true,
      firstWinAchie: true,
      cleanSheetGameAchie: cleansheet
    }
  })
  await this.prismaService.achievement.update({
    where:{
      userId: loser.userid,
    },
    data:{
      firstGameAchie : true,
      firstLoseAchie:true,
    }
  })
}
}



