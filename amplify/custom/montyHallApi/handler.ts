import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  TransactWriteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import * as crypto from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME;

const corsHeaders = {
  'Content-Type': 'application/json',
};

export function parseStartRequest(bodyText: string | null | undefined): { initialDoor: number } {
  if (!bodyText) {
    throw new Error('invalid_initial_door');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    throw new Error('invalid_initial_door');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('invalid_initial_door');
  }
  const obj = parsed as { initialDoor?: unknown };
  const initialDoor = obj.initialDoor;
  if (typeof initialDoor !== 'number' || !Number.isInteger(initialDoor) || initialDoor < 0 || initialDoor > 2) {
    throw new Error('invalid_initial_door');
  }
  return { initialDoor };
}

export function parseFinishRequest(bodyText: string | null | undefined): { gameId: string; finalDoor: number } {
  if (!bodyText) {
    throw new Error('invalid_finish_request');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    throw new Error('invalid_finish_request');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('invalid_finish_request');
  }
  const obj = parsed as { gameId?: unknown; finalDoor?: unknown };
  const gameId = obj.gameId;
  const finalDoor = obj.finalDoor;
  if (typeof gameId !== 'string' || gameId.trim().length === 0) {
    throw new Error('invalid_finish_request');
  }
  if (typeof finalDoor !== 'number' || !Number.isInteger(finalDoor) || finalDoor < 0 || finalDoor > 2) {
    throw new Error('invalid_finish_request');
  }
  return { gameId, finalDoor };
}

export function validateFinalDoor(initialDoor: number, revealedDoor: number, finalDoor: number): void {
  if (finalDoor === revealedDoor) {
    throw new Error('revealed_door_cannot_be_final');
  }
  if (finalDoor !== initialDoor) {
    const otherUnrevealedDoor = 3 - initialDoor - revealedDoor;
    if (finalDoor !== otherUnrevealedDoor) {
      throw new Error('invalid_final_door');
    }
  }
}

export function deriveOutcome(params: {
  initialDoor: number;
  revealedDoor: number;
  prizeDoor: number;
  finalDoor: number;
}): { strategy: 'switch' | 'stay'; won: boolean } {
  const { initialDoor, finalDoor, prizeDoor } = params;
  const strategy = finalDoor === initialDoor ? 'stay' : 'switch';
  const won = finalDoor === prizeDoor;
  return { strategy, won };
}

async function fetchCurrentStats(): Promise<{
  totalGames: number;
  switchGames: number;
  switchWins: number;
  switchRate: number;
  stayGames: number;
  stayWins: number;
  stayRate: number;
}> {
  const statsRes = await docClient.send(new GetCommand({
    TableName: tableName,
    Key: { pk: 'stats', sk: 'global' },
    ConsistentRead: true
  }));
  const item = statsRes.Item;
  if (!item) {
    return {
      totalGames: 0,
      switchGames: 0,
      switchWins: 0,
      switchRate: 0,
      stayGames: 0,
      stayWins: 0,
      stayRate: 0
    };
  }
  const totalGames = Number(item.totalGames ?? 0);
  const switchGames = Number(item.switchGames ?? 0);
  const switchWins = Number(item.switchWins ?? 0);
  const stayGames = Number(item.stayGames ?? 0);
  const stayWins = Number(item.stayWins ?? 0);

  const switchRate = switchGames > 0 ? switchWins / switchGames : 0;
  const stayRate = stayGames > 0 ? stayWins / stayGames : 0;

  return {
    totalGames,
    switchGames,
    switchWins,
    switchRate,
    stayGames,
    stayWins,
    stayRate
  };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const path = event.rawPath || event.requestContext?.http?.path || '';
  const method = event.requestContext?.http?.method || '';

  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    if (method === 'GET' && (path === '/stats' || path.endsWith('/stats'))) {
      const stats = await fetchCurrentStats();
      const snapshotQuery = await docClient.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: {
          ':pk': 'snapshot'
        },
        ScanIndexForward: false,
        Limit: 200
      }));

      const rawItems = snapshotQuery.Items || [];
      const snapshots = rawItems.map(item => ({
        totalGames: Number(item.totalGames ?? 0),
        switchRate: Number(item.switchRate ?? 0),
        stayRate: Number(item.stayRate ?? 0),
        switchGames: Number(item.switchGames ?? 0),
        stayGames: Number(item.stayGames ?? 0),
        createdAt: String(item.createdAt ?? '')
      })).reverse();

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          ...stats,
          snapshots
        })
      };
    }

    if (method === 'POST' && (path === '/game/start' || path.endsWith('/game/start'))) {
      let initialDoor: number;
      try {
        const parsed = parseStartRequest(event.body);
        initialDoor = parsed.initialDoor;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'invalid_initial_door';
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: msg })
        };
      }

      const gameId = crypto.randomUUID();
      const prizeDoor = crypto.randomInt(3);

      let revealedDoor: number;
      if (initialDoor === prizeDoor) {
        const options = [0, 1, 2].filter(d => d !== initialDoor);
        const randomIndex = crypto.randomInt(2);
        revealedDoor = options[randomIndex];
      } else {
        revealedDoor = 3 - initialDoor - prizeDoor;
      }

      const now = new Date().toISOString();
      const ttl = Math.floor(Date.now() / 1000) + 86400;

      await docClient.send(new PutCommand({
        TableName: tableName,
        Item: {
          pk: 'game',
          sk: gameId,
          status: 'pending',
          initialDoor,
          prizeDoor,
          revealedDoor,
          createdAt: now,
          ttl
        }
      }));

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          gameId,
          initialDoor,
          revealedDoor
        })
      };
    }

    if (method === 'POST' && (path === '/game/finish' || path.endsWith('/game/finish'))) {
      let gameId: string;
      let finalDoor: number;
      try {
        const parsed = parseFinishRequest(event.body);
        gameId = parsed.gameId;
        finalDoor = parsed.finalDoor;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'invalid_finish_request';
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: msg })
        };
      }

      const gameRes = await docClient.send(new GetCommand({
        TableName: tableName,
        Key: { pk: 'game', sk: gameId },
        ConsistentRead: true
      }));

      const gameItem = gameRes.Item;
      if (!gameItem) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'game_not_found' })
        };
      }

      if (gameItem.status === 'complete') {
        const stats = await fetchCurrentStats();
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            prizeDoor: Number(gameItem.prizeDoor),
            finalDoor: Number(gameItem.finalDoor),
            strategy: String(gameItem.strategy),
            won: Boolean(gameItem.won),
            stats
          })
        };
      }

      try {
        validateFinalDoor(Number(gameItem.initialDoor), Number(gameItem.revealedDoor), finalDoor);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'invalid_final_door';
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: msg })
        };
      }

      const { strategy, won } = deriveOutcome({
        initialDoor: Number(gameItem.initialDoor),
        revealedDoor: Number(gameItem.revealedDoor),
        prizeDoor: Number(gameItem.prizeDoor),
        finalDoor
      });

      const now = new Date().toISOString();
      const isSwitch = strategy === 'switch';
      const isWon = won;

      const transactionParams = {
        TransactItems: [
          {
            Update: {
              TableName: tableName,
              Key: { pk: 'game', sk: gameId },
              UpdateExpression: 'SET #status = :complete, finalDoor = :finalDoor, strategy = :strategy, won = :won, completedAt = :completedAt',
              ConditionExpression: '#status = :pending',
              ExpressionAttributeNames: {
                '#status': 'status'
              },
              ExpressionAttributeValues: {
                ':complete': 'complete',
                ':pending': 'pending',
                ':finalDoor': finalDoor,
                ':strategy': strategy,
                ':won': won,
                ':completedAt': now
              }
            }
          },
          {
            Update: {
              TableName: tableName,
              Key: { pk: 'stats', sk: 'global' },
              UpdateExpression: 'SET updatedAt = :now ADD totalGames :one, switchGames :switchGame, switchWins :switchWin, stayGames :stayGame, stayWins :stayWin',
              ExpressionAttributeValues: {
                ':now': now,
                ':one': 1,
                ':switchGame': isSwitch ? 1 : 0,
                ':switchWin': (isSwitch && isWon) ? 1 : 0,
                ':stayGame': !isSwitch ? 1 : 0,
                ':stayWin': (!isSwitch && isWon) ? 1 : 0
              }
            }
          }
        ],
        ClientRequestToken: gameId
      };

      try {
        await docClient.send(new TransactWriteCommand(transactionParams));
      } catch (err: unknown) {
        const reReadRes = await docClient.send(new GetCommand({
          TableName: tableName,
          Key: { pk: 'game', sk: gameId },
          ConsistentRead: true
        }));
        const updatedItem = reReadRes.Item;
        if (updatedItem && updatedItem.status === 'complete') {
          const stats = await fetchCurrentStats();
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              prizeDoor: Number(updatedItem.prizeDoor),
              finalDoor: Number(updatedItem.finalDoor),
              strategy: String(updatedItem.strategy),
              won: Boolean(updatedItem.won),
              stats
            })
          };
        }
        throw err;
      }

      const stats = await fetchCurrentStats();

      const snapshotSk = String(stats.totalGames).padStart(12, '0');
      const snapshotItem = {
        pk: 'snapshot',
        sk: snapshotSk,
        totalGames: stats.totalGames,
        switchGames: stats.switchGames,
        switchWins: stats.switchWins,
        stayGames: stats.stayGames,
        stayWins: stats.stayWins,
        switchRate: stats.switchRate,
        stayRate: stats.stayRate,
        createdAt: now
      };

      try {
        await docClient.send(new PutCommand({
          TableName: tableName,
          Item: snapshotItem
        }));
      } catch (err) {
        try {
          await docClient.send(new PutCommand({
            TableName: tableName,
            Item: snapshotItem
          }));
        } catch (retryErr) {
          console.error('Failed to write snapshot after retry:', retryErr);
        }
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          prizeDoor: Number(gameItem.prizeDoor),
          finalDoor,
          strategy,
          won,
          stats
        })
      };
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'not_found' })
    };
  } catch (err: unknown) {
    console.error('Unhandled handler error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'internal_server_error' })
    };
  }
}
