/**
 * Getting Started Onboarding Progress Tracker
 * Guides first-time Owners and Customers through initial steps.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card } from './Card';
import { COLORS, SIZES, FONTS } from '../constants/theme';

export const SetupTracker = ({
  title = '🚀 Getting Started',
  subtitle = 'Complete these steps to set up your account',
  steps = [],
  storageKey = 'tracker_dismissed',
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((val) => {
      if (val === 'true') {
        setIsDismissed(true);
      }
    });
  }, [storageKey]);

  if (isDismissed || !steps || steps.length === 0) {
    return null;
  }

  const completedCount = steps.filter((s) => s.isCompleted).length;
  const totalCount = steps.length;
  const percent = Math.round((completedCount / totalCount) * 100);
  const isAllDone = completedCount === totalCount;

  const handleDismiss = async () => {
    setIsDismissed(true);
    await AsyncStorage.setItem(storageKey, 'true');
  };

  return (
    <Card style={[styles.card, isAllDone && styles.cardAllDone]}>
      {/* Tracker Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleBadgeRow}>
            <Text style={styles.title}>{title}</Text>
            {isAllDone && (
              <View style={styles.doneBadge}>
                <Text style={styles.doneBadgeText}>ALL DONE! 🎉</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <TouchableOpacity
          onPress={() => setIsCollapsed(!isCollapsed)}
          style={styles.collapseBtn}
        >
          <Text style={styles.collapseBtnText}>{isCollapsed ? 'Show ▼' : 'Hide ▲'}</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar & Stat */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${percent}%` },
              isAllDone && { backgroundColor: COLORS.success },
            ]}
          />
        </View>
        <Text style={styles.progressLabel}>
          {completedCount} of {totalCount} completed ({percent}%)
        </Text>
      </View>

      {/* Steps List (Collapsible) */}
      {!isCollapsed && (
        <View style={styles.stepsList}>
          {steps.map((step, idx) => {
            const isDone = step.isCompleted;
            return (
              <TouchableOpacity
                key={step.id || idx}
                activeOpacity={0.7}
                style={[styles.stepItem, isDone && styles.stepItemDone]}
                onPress={step.onPress}
                disabled={!step.onPress}
              >
                {/* Step Indicator */}
                <View style={[styles.stepDot, isDone && styles.stepDotDone]}>
                  <Text style={[styles.stepDotText, isDone && styles.stepDotTextDone]}>
                    {isDone ? '✓' : idx + 1}
                  </Text>
                </View>

                {/* Step Content */}
                <View style={styles.stepContent}>
                  <View style={styles.stepTitleRow}>
                    <Text style={[styles.stepTitle, isDone && styles.stepTitleDone]}>
                      {step.title}
                    </Text>
                    {step.badge ? (
                      <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>{step.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>

                {/* Action Arrow */}
                {step.onPress && (
                  <View style={styles.arrowBox}>
                    <Text style={[styles.arrowText, isDone && styles.arrowTextDone]}>
                      {isDone ? 'Edit' : 'Start →'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Dismiss button when all done or if user prefers */}
          {isAllDone && (
            <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
              <Text style={styles.dismissBtnText}>Dismiss Checklist ✓</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FFE0B2',
    borderRadius: SIZES.radiusLg,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  cardAllDone: {
    borderColor: '#C8E6C9',
    backgroundColor: '#F9FBF9',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginRight: 8,
  },
  doneBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  doneBadgeText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  collapseBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  collapseBtnText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  progressContainer: {
    marginTop: 12,
    marginBottom: 10,
  },
  progressBarBg: {
    height: 7,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'right',
  },
  stepsList: {
    marginTop: 6,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    padding: 12,
    marginVertical: 4,
  },
  stepItemDone: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E0E0',
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFF3E0',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepDotDone: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  stepDotTextDone: {
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  stepTitleDone: {
    color: COLORS.textSecondary,
  },
  stepBadge: {
    marginLeft: 6,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  stepBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
  },
  stepDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  arrowBox: {
    marginLeft: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  arrowText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  arrowTextDone: {
    color: COLORS.textMuted,
  },
  dismissBtn: {
    marginTop: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: SIZES.radiusSm,
    backgroundColor: '#E8F5E9',
  },
  dismissBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.success,
  },
});

export default SetupTracker;

