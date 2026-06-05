import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
  }

  async uploadFile(file: any, folder = 'general'): Promise<string> {
    const imgbbKey = this.configService.get<string>('IMGBB_API_KEY');
    if (imgbbKey) {
      return this.uploadToImgbb(file, imgbbKey);
    }

    return this.uploadLocal(file, folder);
  }

  private async uploadLocal(file: any, folder: string): Promise<string> {
    try {
      const targetDir = path.join(this.uploadDir, folder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const fileExt = path.extname(file.originalname);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const fileName = `${uniqueSuffix}${fileExt}`;
      const filePath = path.join(targetDir, fileName);

      await fs.promises.writeFile(filePath, file.buffer);

      const apiUrl = this.configService.get<string>('API_URL') || 'http://localhost:8000';
      return `${apiUrl}/uploads/${folder}/${fileName}`;
    } catch (error) {
      console.error('[STORAGE] Erro ao salvar arquivo localmente:', error);
      throw new InternalServerErrorException('Erro ao salvar o arquivo no servidor.');
    }
  }

  private async uploadToImgbb(file: any, apiKey: string): Promise<string> {
    try {
      const formData = new FormData();
      const blob = new Blob([file.buffer], { type: file.mimetype });
      formData.append('image', blob, file.originalname);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Resposta HTTP inválida: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      if (data.success) {
        return data.data.url;
      } else {
        throw new Error(data.error?.message || 'Erro desconhecido retornado pelo ImgBB');
      }
    } catch (error) {
      console.error('[STORAGE] Erro ao enviar para ImgBB:', error);
      throw new InternalServerErrorException(`Erro ao hospedar a imagem: ${error.message}`);
    }
  }

  async deleteLocalFile(fileUrl: string): Promise<void> {
    try {
      const apiUrl = this.configService.get<string>('API_URL') || 'http://localhost:8000';
      if (!fileUrl.startsWith(apiUrl)) {
        // Não é uma URL local, possivelmente ImgBB. Não fazemos nada.
        return;
      }

      const urlPath = fileUrl.replace(`${apiUrl}/uploads/`, '');
      const filePath = path.join(this.uploadDir, urlPath);

      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log(`[STORAGE] Arquivo excluído com sucesso: ${filePath}`);
      }
    } catch (error) {
      console.warn(`[STORAGE] Erro ao tentar excluir arquivo local ${fileUrl}:`, error);
    }
  }
}
