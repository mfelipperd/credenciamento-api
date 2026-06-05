import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { Brand } from './entities/brand.entity';
import { CreateClientDto, UpdateClientDto } from './clients.dto';
import { StorageService } from '../../storage/storage.service';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    private readonly storageService: StorageService,
  ) {}

  async create(createClientDto: CreateClientDto): Promise<Client> {
    const client = this.clientRepository.create(createClientDto);
    return await this.clientRepository.save(client);
  }

  async findAll(fairId?: string): Promise<Client[]> {
    const where: any = {};
    if (fairId) {
      where.fairId = fairId;
    }
    return await this.clientRepository.find({
      where,
      relations: ['brands'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id },
      relations: ['brands'],
    });

    if (!client) {
      throw new NotFoundException(`Cliente com ID ${id} não encontrado`);
    }

    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);

    Object.assign(client, updateClientDto);

    return await this.clientRepository.save(client);
  }

  async remove(id: string): Promise<void> {
    const client = await this.findOne(id);
    
    // Se o cliente tem marcas, exclui as logos locais antes de deletar o cliente
    if (client.brands && client.brands.length > 0) {
      for (const brand of client.brands) {
        await this.storageService.deleteLocalFile(brand.logoUrl);
      }
    }

    await this.clientRepository.remove(client);
  }

  async findByEmail(email: string): Promise<Client | null> {
    return await this.clientRepository.findOne({
      where: { email },
      relations: ['brands'],
    });
  }

  async findByCnpj(cnpj: string): Promise<Client | null> {
    return await this.clientRepository.findOne({
      where: { cnpj },
      relations: ['brands'],
    });
  }

  async searchByName(name: string, fairId?: string): Promise<Client[]> {
    const query = this.clientRepository
      .createQueryBuilder('client')
      .leftJoinAndSelect('client.brands', 'brand')
      .where('client.name LIKE :name', { name: `%${name}%` });

    if (fairId) {
      query.andWhere('client.fairId = :fairId', { fairId });
    }

    return await query.orderBy('client.name', 'ASC').getMany();
  }

  // --- Operações de Marcas ---

  async addBrand(clientId: string, name: string, logoUrl: string): Promise<Brand> {
    const client = await this.findOne(clientId);
    const brand = this.brandRepository.create({
      clientId: client.id,
      name,
      logoUrl,
    });
    return await this.brandRepository.save(brand);
  }

  async updateBrand(brandId: string, name?: string, logoUrl?: string): Promise<Brand> {
    const brand = await this.brandRepository.findOne({ where: { id: brandId } });
    if (!brand) {
      throw new NotFoundException(`Marca com ID ${brandId} não encontrada`);
    }

    if (name !== undefined) {
      brand.name = name;
    }
    if (logoUrl !== undefined) {
      // Se estamos trocando de logo, exclui a antiga
      await this.storageService.deleteLocalFile(brand.logoUrl);
      brand.logoUrl = logoUrl;
    }

    return await this.brandRepository.save(brand);
  }

  async deleteBrand(brandId: string): Promise<void> {
    const brand = await this.brandRepository.findOne({ where: { id: brandId } });
    if (!brand) {
      throw new NotFoundException(`Marca com ID ${brandId} não encontrada`);
    }

    // Exclui o arquivo físico local
    await this.storageService.deleteLocalFile(brand.logoUrl);

    await this.brandRepository.remove(brand);
  }

  async findBrandsByFair(fairId: string): Promise<Brand[]> {
    return await this.brandRepository
      .createQueryBuilder('brand')
      .innerJoinAndSelect('brand.client', 'client')
      .where('client.fairId = :fairId', { fairId })
      .orderBy('brand.name', 'ASC')
      .getMany();
  }

  async findBrandById(brandId: string): Promise<Brand | null> {
    return await this.brandRepository.findOne({ where: { id: brandId } });
  }
}
