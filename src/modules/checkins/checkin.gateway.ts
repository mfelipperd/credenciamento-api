import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Visitor } from '../visitors/entities/visitor.entity';

@WebSocketGateway({
  cors: {
    origin: '*', // ajuste conforme segurança
  },
})
export class CheckinGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    console.log('WebSocket initialized', server);
  }

  sendCheckinData(visitorData: Partial<Visitor>) {
    this.server.emit('checkinConfirmed', visitorData); // envia a todos conectados
  }
}
