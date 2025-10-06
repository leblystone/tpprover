import React from 'react';
import { WIDGET_TYPES } from '../../utils/dashboardCustomization';
import TasksWidget from './widgets/TasksWidget';
import UpcomingOrderWidget from './widgets/UpcomingOrderWidget';
import UpcomingBuysWidget from './widgets/UpcomingBuysWidget';
import PendingVendorsWidget from './widgets/PendingVendorsWidget';
import AnalyticsWidget from './widgets/AnalyticsWidget';
import ComplianceWidget from './widgets/ComplianceWidget';
import SpendingWidget from './widgets/SpendingWidget';
import LeadTimeWidget from './widgets/LeadTimeWidget';
import InventoryWidget from './widgets/InventoryWidget';
import BadgesWidget from './widgets/BadgesWidget';
import GoalsOnlyWidget from './widgets/GoalsOnlyWidget';
import MetricsWidget from './widgets/MetricsWidget';
import SupplementsWidget from './widgets/SupplementsWidget';
import GoalsWidget from './widgets/GoalsWidget';
import QuickActionsWidget from './widgets/QuickActionsWidget';
import WaterTrackerWidget from './widgets/WaterTrackerWidget';
import GlossaryWidget from './widgets/GlossaryWidget';
import FeedbackWidget from './widgets/FeedbackWidget';
import NotesWidget from './widgets/NotesWidget';
import InjectionHistoryWidget from './widgets/InjectionHistoryWidget';

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

    case WIDGET_TYPES.COMPLIANCE:
      return (
        <ComplianceWidget 
          widget={widget} 
          theme={theme} 
        />
      );

    case WIDGET_TYPES.SPENDING:
      return (
        <SpendingWidget 
          widget={widget} 
          theme={theme} 
        />
      );

    case WIDGET_TYPES.LEAD_TIME:
      return (
        <LeadTimeWidget 
          widget={widget} 
          theme={theme} 
        />
      );

    case WIDGET_TYPES.INVENTORY:
      return (
        <InventoryWidget 
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
        <GoalsOnlyWidget 
          widget={widget} 
          theme={theme} 
          goals={props.goals}
          onGoalToggle={props.onGoalToggle}
          onAddGoal={props.onAddGoal}
          onEditGoal={props.onEditGoal}
        />
      );

    case 'goals_only':
      return (
        <GoalsOnlyWidget 
          widget={widget} 
          theme={theme} 
          goals={props.goals}
          onGoalToggle={props.onGoalToggle}
          onAddGoal={props.onAddGoal}
          onEditGoal={props.onEditGoal}
        />
      );

    case 'metrics_only':
      return (
        <MetricsWidget 
          widget={widget} 
          theme={theme} 
          metrics={props.metrics}
          onAddMetric={props.onAddMetric}
          onEditMetric={props.onEditMetric}
        />
      );
      
    case WIDGET_TYPES.SUPPLEMENTS:
      return (
        <SupplementsWidget 
          widget={widget} 
          theme={theme} 
          supplements={props.supplements || []}
          onAddSupplement={props.onAddSupplement}
          onEditSupplement={props.onEditSupplement}
          onDeleteSupplement={props.onDeleteSupplement}
        />
      );

    case WIDGET_TYPES.QUICK_ACTIONS:
      return (
        <QuickActionsWidget 
          widget={widget} 
          theme={theme}
        />
      );

    case WIDGET_TYPES.WATER_TRACKER:
      return (
        <WaterTrackerWidget 
          widget={widget} 
          theme={theme}
        />
      );

    case WIDGET_TYPES.GLOSSARY:
      return (
        <GlossaryWidget 
          widget={widget} 
          theme={theme}
        />
      );

    case WIDGET_TYPES.FEEDBACK:
      return (
        <FeedbackWidget 
          widget={widget} 
          theme={theme}
        />
      );

    case WIDGET_TYPES.NOTES:
      return (
        <NotesWidget 
          widget={widget} 
          theme={theme}
        />
      );
      
    case WIDGET_TYPES.INJECTION_HISTORY:
      return (
        <InjectionHistoryWidget 
          widget={widget} 
          theme={theme}
        />
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
