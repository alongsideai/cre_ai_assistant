import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/owner-dashboard
 *
 * Returns owner-level portfolio KPIs and insights for the dashboard
 */
export async function GET() {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    // Run all queries in parallel for efficiency
    const [
      openWorkOrders,
      highPriorityOpen,
      criticalImpactOpen,
      dueTodayActions,
      propertiesWithOpenWOs,
      recentHighPriorityWorkOrders,
      recentAutomationActions,
    ] = await Promise.all([
      // KPI 1: Open work orders count
      prisma.workOrder.count({
        where: {
          status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS'] },
        },
      }),

      // KPI 2: High/Emergency priority open count
      prisma.workOrder.count({
        where: {
          status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS'] },
          priority: { in: ['HIGH', 'EMERGENCY'] },
        },
      }),

      // KPI 3: Critical/Major business impact open count
      prisma.workOrder.count({
        where: {
          status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS'] },
          businessImpact: { in: ['MAJOR', 'CRITICAL'] },
        },
      }),

      // KPI 4: Actions due today
      prisma.scheduledAction.count({
        where: {
          status: 'PENDING',
          scheduledFor: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),

      // Top properties by open work orders (raw query for grouping)
      prisma.workOrder.groupBy({
        by: ['propertyId'],
        where: {
          status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS'] },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 5,
      }),

      // Recent high-priority work orders
      prisma.workOrder.findMany({
        where: {
          priority: { in: ['HIGH', 'EMERGENCY'] },
        },
        include: {
          property: true,
          space: true,
          occupier: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Recent executed automation actions
      prisma.scheduledAction.findMany({
        where: {
          status: 'EXECUTED',
        },
        include: {
          workOrder: {
            include: {
              property: true,
            },
          },
        },
        orderBy: { executedAt: 'desc' },
        take: 5,
      }),
    ]);

    // Get property details and high-priority counts for top properties
    const propertyIds = propertiesWithOpenWOs.map((p) => p.propertyId);
    const [properties, highPriorityCounts] = await Promise.all([
      prisma.property.findMany({
        where: { id: { in: propertyIds } },
        select: { id: true, name: true },
      }),
      // Get high/emergency counts per property
      prisma.workOrder.groupBy({
        by: ['propertyId'],
        where: {
          propertyId: { in: propertyIds },
          status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS'] },
          priority: { in: ['HIGH', 'EMERGENCY'] },
        },
        _count: { id: true },
      }),
    ]);

    // Build property map for quick lookup
    const propertyMap = new Map(properties.map((p) => [p.id, p.name]));
    const highPriorityMap = new Map(
      highPriorityCounts.map((h) => [h.propertyId, h._count.id])
    );

    // Build top properties array
    const topProperties = propertiesWithOpenWOs.map((p) => ({
      id: p.propertyId,
      name: propertyMap.get(p.propertyId) || 'Unknown Property',
      openCount: p._count.id,
      highPriorityCount: highPriorityMap.get(p.propertyId) || 0,
    }));

    // Format recent work orders
    const formattedRecentWorkOrders = recentHighPriorityWorkOrders.map((wo) => ({
      id: wo.id,
      summary: wo.summary,
      status: wo.status,
      priority: wo.priority,
      businessImpact: wo.businessImpact,
      issueCategory: wo.issueCategory,
      createdAt: wo.createdAt.toISOString(),
      property: {
        id: wo.property.id,
        name: wo.property.name,
      },
      space: wo.space
        ? {
            id: wo.space.id,
            spaceLabel: wo.space.spaceLabel,
          }
        : null,
      occupier: wo.occupier
        ? {
            id: wo.occupier.id,
            name: wo.occupier.brandName || wo.occupier.legalName,
          }
        : null,
    }));

    // Format recent automation actions
    const formattedRecentActions = recentAutomationActions.map((action) => ({
      id: action.id,
      actionType: action.actionType,
      description: action.description,
      scheduledFor: action.scheduledFor.toISOString(),
      executedAt: action.executedAt?.toISOString() || null,
      workOrder: {
        id: action.workOrder.id,
        summary: action.workOrder.summary,
        property: {
          id: action.workOrder.property.id,
          name: action.workOrder.property.name,
        },
      },
    }));

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          openWorkOrders,
          highPriorityOpen,
          criticalImpactOpen,
          dueTodayActions,
        },
        topProperties,
        recentHighPriorityWorkOrders: formattedRecentWorkOrders,
        recentAutomationActions: formattedRecentActions,
      },
    });
  } catch (error) {
    console.error('Error fetching owner dashboard data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard data',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
