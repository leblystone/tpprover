import React from 'react';
import { WIDGET_TYPES } from '../../utils/dashboardCustomization';
import TasksWidget from './widgets/TasksWidget';
import UpcomingOrderWidget from './widgets/UpcomingOrderWidget';
import UpcomingBuysWidget from './widgets/UpcomingBuysWidget';
import PendingVendorsWidget from './widgets/PendingVendorsWidget';
import AnalyticsWidget from './widgets/AnalyticsWidget';
import BadgesWidget from './widgets/BadgesWidget';
import GoalsWidget from './widgets/GoalsWidget';

const WidgetFactory = ({ widget, theme, ...props }) => {
  switch (widget.type) {
    case WIDGET_TYPES.TASKS:
      return (
        <TasksWidget 
          widget={widget} 
          theme={theme} 
          tasks={props.tasks}
          onToggle={props.onTaskToggle}
        />
      );
      
    case WIDGET_TYPES.UPCOMING_ORDER:
      return (
        <UpcomingOrderWidget 
          widget={widget} 
          theme={theme} 
          order={props.incomingOrder}
          onNewOrder={props.onNewOrder}
        />
      );
      
    case WIDGET_TYPES.UPCOMING_BUYS:
      return (
        <UpcomingBuysWidget 
          widget={widget} 
          theme={theme} 
          buys={props.upcomingBuys}
          onAdd={props.onAddBuy}
        />
      );
      
    case WIDGET_TYPES.PENDING_VENDORS:
      if (!props.pendingVendors || props.pendingVendors.length === 0) {
        return null; // Don't render empty pending vendors widget
      }
      return (
        <PendingVendorsWidget 
          widget={widget} 
          theme={theme} 
          vendors={props.pendingVendors}
          onViewAll={props.onViewAllVendors}
          onComplete={props.onCompleteVendor}
        />
      );
      
    case WIDGET_TYPES.ANALYTICS:
      return (
        <AnalyticsWidget 
          widget={widget} 
          theme={theme} 
        />
      );
      
    case WIDGET_TYPES.BADGES:
      return (
        <BadgesWidget 
          widget={widget} 
          theme={theme} 
        />
      );
      
    case WIDGET_TYPES.GOALS:
      return (
        <GoalsWidget 
          widget={widget} 
          theme={theme} 
          goals={props.goals}
          metrics={props.metrics}
          onGoalToggle={props.onGoalToggle}
          onAddGoal={props.onAddGoal}
          onAddMetric={props.onAddMetric}
          onEditGoal={props.onEditGoal}
          onEditMetric={props.onEditMetric}
        />
      );
      
    case WIDGET_TYPES.SUPPLEMENTS:
      return (
        <div className="p-6 h-full">
          <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text }}>
            Supplements
          </h3>
          <p style={{ color: theme.textLight }}>
            Supplement management widget - coming soon!
          </p>
        </div>
      );
      
    default:
      return (
        <div className="p-6 h-full flex items-center justify-center">
          <p style={{ color: theme.textLight }}>
            Unknown widget type: {widget.type}
          </p>
        </div>
      );
  }
};

export default WidgetFactory;
