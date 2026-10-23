import { request } from '../client';

export type DashboardWidgetSize = 'sm' | 'md' | 'lg';

/** One widget on the user's home dashboard, in display order. */
export interface DashboardWidgetPlacement {
  id: string;
  size: DashboardWidgetSize;
}

type LayoutResponse = { success: boolean; message?: string; data: { widgets: DashboardWidgetPlacement[] | null } };

export const dashboardService = {
  /** The signed-in user's layout; `widgets: null` = they use the default layout. */
  getMyLayout: () => request<LayoutResponse>('/users/me/dashboard'),
  /** Saves the layout; pass `null` to go back to the default. */
  saveMyLayout: (widgets: DashboardWidgetPlacement[] | null) =>
    request<LayoutResponse>('/users/me/dashboard', { method: 'PUT', body: JSON.stringify({ widgets }) }),
};
