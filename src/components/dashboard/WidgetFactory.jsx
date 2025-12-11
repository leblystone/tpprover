import React, { useState, useEffect } from 'react';
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
import NotesWidget from './widgets/NotesWidget';
import InjectionHistoryWidget from './widgets/InjectionHistoryWidget';
import TipsWidget from './widgets/TipsWidget';
import WishlistWidget from './widgets/WishlistWidget';

const WidgetFactory = ({ widget, theme, isReadOnly, onUpgrade, ...props }) => {
  const [groupBuysEnabled, setGroupBuysEnabled] = useState(true);
  
  // Check if group buys are enabled
  useEffect(() => {
    import('../../utils/featureSettings').then(({ areGroupBuysEnabled }) => {
      setGroupBuysEnabled(areGroupBuysEnabled());
    });
  }, []);
  
  // Don't render UpcomingBuysWidget if group buys are disabled
  if (widget.type === WIDGET_TYPES.UPCOMING_BUYS && !groupBuysEnabled) {
    return null;
  }
  
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
          isReadOnly={isReadOnly}
          onUpgrade={onUpgrade}
        />
      );
      
    case WIDGET_TYPES.UPCOMING_BUYS:
      return (
        <UpcomingBuysWidget 
          widget={widget} 
          theme={theme} 
          buys={props.upcomingBuys}
          onAdd={props.onAddBuy}
          isReadOnly={isReadOnly}
          onUpgrade={onUpgrade}
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
          isReadOnly={isReadOnly}
          onUpgrade={onUpgrade}
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
          isReadOnly={isReadOnly}
          onUpgrade={onUpgrade}
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
          isReadOnly={isReadOnly}
          onUpgrade={onUpgrade}
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

    case WIDGET_TYPES.TIPS:
      return (
        <TipsWidget 
          widget={widget} 
          theme={theme}
        />
      );

    case WIDGET_TYPES.WISHLIST:
      return (
        <WishlistWidget 
          widget={widget} 
          theme={theme} 
          wishlist={props.wishlist}
          onAdd={props.onAddWishlistItem}
          isReadOnly={isReadOnly}
          onUpgrade={onUpgrade}
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
