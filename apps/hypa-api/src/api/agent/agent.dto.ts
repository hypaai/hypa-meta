import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { CHAT_FILE_LIMIT, CHAT_FILE_MIMES } from '@hypa/config/chat-attachments';

export class AgentContextDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  fieldText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  selectedText?: string;
}

export class AgentHistoryTurnDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(8000)
  content: string;
}

export class AgentAttachmentDto {
  @IsString()
  @IsNotEmpty()
  data: string;

  @IsOptional()
  @IsString()
  mime?: string;
}

/** An image or audio file the model reads or transcribes. */
export class AgentFileDto {
  @IsString()
  @MaxLength(7_000_000)
  data: string;

  @IsIn([...CHAT_FILE_MIMES])
  mime: string;

  @IsString()
  @MaxLength(255)
  name: string;
}

export class AgentAsrDto {
  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsString()
  @IsNotEmpty()
  model: string;
}

export class AgentRequestDto {
  @IsUUID()
  requestId: string;

  @IsOptional()
  @IsString()
  input?: string;

  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsOptional()
  @IsIn(['app', 'keyboard'])
  surface?: 'app' | 'keyboard';

  @IsOptional()
  @IsString()
  chatId?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  audio?: string;

  @IsOptional()
  @IsIn(['base64', 'url'])
  audioType?: 'base64' | 'url';

  @IsOptional()
  @IsBoolean()
  preferAudio?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => AgentAsrDto)
  asr?: AgentAsrDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AgentContextDto)
  context?: AgentContextDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => AgentAttachmentDto)
  attachments?: AgentAttachmentDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(CHAT_FILE_LIMIT)
  @ValidateNested({ each: true })
  @Type(() => AgentFileDto)
  files?: AgentFileDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AgentHistoryTurnDto)
  history?: AgentHistoryTurnDto[];
}
