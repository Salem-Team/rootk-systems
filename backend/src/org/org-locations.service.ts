import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { resolveGoogleMapsUrl } from "../lib/geo";
import { mapLoc } from "./org-mappers";

/** Office locations CRUD + Google Maps URL resolution. */
@Injectable()
export class OrgLocationsService {
  constructor(private readonly prisma: PrismaService) {}

  listLocations(companyId: string) {
    return this.prisma.officeLocation
      .findMany({ where: { companyId, deletedAt: null }, orderBy: { name: "asc" } })
      .then((rows) => rows.map(mapLoc));
  }

  async resolveMapsUrl(url: string) {
    const trimmed = String(url ?? "").trim();
    if (!trimmed) {
      throw new BadRequestException("Google Maps URL required");
    }
    const point = await resolveGoogleMapsUrl(trimmed);
    if (!point) {
      throw new BadRequestException(
        "Could not extract coordinates from Google Maps URL"
      );
    }
    return point;
  }

  async upsertLocation(companyId: string, actorId: string, body: Record<string, unknown>) {
    if (body.id) {
      const current = await this.prisma.officeLocation.findFirst({
        where: { id: String(body.id), companyId, deletedAt: null },
      });
      if (!current) throw new NotFoundException("Location not found");
      const row = await this.prisma.officeLocation.update({
        where: { id: String(body.id) },
        data: {
          name: body.name as string | undefined,
          city: body.city as string | undefined,
          address: body.address as string | undefined,
          timezone: body.timezone as string | undefined,
          capacity: body.capacity !== undefined ? Number(body.capacity) : undefined,
          workingDays: body.workingDays as string | undefined,
          latitude:
            body.latitude !== undefined && body.latitude !== null && body.latitude !== ""
              ? Number(body.latitude)
              : body.latitude === null
                ? null
                : undefined,
          longitude:
            body.longitude !== undefined &&
            body.longitude !== null &&
            body.longitude !== ""
              ? Number(body.longitude)
              : body.longitude === null
                ? null
                : undefined,
          radiusMeters:
            body.radiusMeters !== undefined
              ? Number(body.radiusMeters)
              : undefined,
          active: body.active as boolean | undefined,
          updatedBy: actorId,
          version: { increment: 1 },
        },
      });
      return mapLoc(row);
    }
    const row = await this.prisma.officeLocation.create({
      data: {
        companyId,
        name: String(body.name ?? ""),
        city: String(body.city ?? ""),
        address: String(body.address ?? ""),
        timezone: String(body.timezone ?? "Africa/Cairo"),
        capacity: Number(body.capacity ?? 20),
        workingDays: String(body.workingDays ?? "Sun-Thu"),
        latitude:
          body.latitude !== undefined && body.latitude !== null && body.latitude !== ""
            ? Number(body.latitude)
            : null,
        longitude:
          body.longitude !== undefined &&
          body.longitude !== null &&
          body.longitude !== ""
            ? Number(body.longitude)
            : null,
        radiusMeters: Number(body.radiusMeters ?? 200),
        active: body.active !== false,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    return mapLoc(row);
  }

  async deleteLocation(companyId: string, actorId: string, id: string) {
    const current = await this.prisma.officeLocation.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!current) throw new NotFoundException("Location not found");
    await this.prisma.officeLocation.update({
      where: { id },
      data: { deletedAt: new Date(), isArchived: true, updatedBy: actorId, version: { increment: 1 } },
    });
    return true;
  }
}
