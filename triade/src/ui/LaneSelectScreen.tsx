import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HIT_TARGET } from './PauseButton';
import { SAFE_MARGIN } from './layout';
import type { EdgeInsets } from './layout';
import { LANES } from '../game/lanes';

export interface LaneSelectScreenProps {
  selectedIndex: number;
  hasActiveMatch: boolean;
  insets: EdgeInsets;
  onSelectLane: (index: number) => void;
  onJogar: () => void;
  onRestorePurchases?: () => void | Promise<void>;
  restoreBusy?: boolean;
}

export function LaneSelectScreen({
  selectedIndex,
  hasActiveMatch,
  insets,
  onSelectLane,
  onJogar,
  onRestorePurchases,
  restoreBusy,
}: LaneSelectScreenProps) {
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

  const handleCardPress = (index: number) => {
    if (index === selectedIndex) return;
    if (hasActiveMatch) {
      // Show inline confirm banner first; Alert is secondary system fallback.
      setPendingIndex(index);
    } else {
      onSelectLane(index);
    }
  };

  const handleConfirm = () => {
    if (pendingIndex !== null) {
      const idx = pendingIndex;
      setPendingIndex(null);
      onSelectLane(idx);
    }
  };

  const handleCancel = () => setPendingIndex(null);

  const topPad = (insets?.top ?? 0) + SAFE_MARGIN;
  const bottomPad = (insets?.bottom ?? 0) + SAFE_MARGIN;
  const leftPad = (insets?.left ?? 0) + SAFE_MARGIN;
  const rightPad = (insets?.right ?? 0) + SAFE_MARGIN;

  return (
    <View
      style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad, paddingLeft: leftPad, paddingRight: rightPad }]}
      accessibilityLabel="Lane Select"
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Tríade</Text>
        <Text style={styles.subtitle}>Escolha sua pista</Text>

        <View style={styles.cardsRow}>
          {LANES.map((lane) => {
            const isSelected = lane.index === selectedIndex;
            return (
              <Pressable
                key={lane.id}
                onPress={() => handleCardPress(lane.index)}
                style={[styles.card, isSelected ? styles.cardSelected : styles.cardIdle]}
                accessibilityRole="button"
                accessibilityLabel={`${lane.label}${lane.subtitle ? ` ${lane.subtitle}` : ''}`}
                accessibilityState={{ selected: isSelected }}
              >
                {isSelected ? <View style={styles.accentBar} /> : null}
                <Text style={styles.cardLabel}>{lane.label}</Text>
                {lane.subtitle ? <Text style={styles.cardSubtitle}>{lane.subtitle}</Text> : null}
                <Text style={styles.cardTone}>{lane.toneLine}</Text>
              </Pressable>
            );
          })}
        </View>

        {pendingIndex !== null ? (
          <View style={styles.warningBanner} accessibilityLabel="Mudar de pista inicia um novo jogo">
            <Text style={styles.warningText}>Mudar de pista inicia um novo jogo. Continuar?</Text>
            <View style={styles.warningActions}>
              <Pressable
                onPress={handleConfirm}
                style={styles.warningConfirm}
                accessibilityRole="button"
                accessibilityLabel="Confirmar"
              >
                <Text style={styles.warningConfirmLabel}>Confirmar</Text>
              </Pressable>
              <Pressable
                onPress={handleCancel}
                style={styles.warningCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
              >
                <Text style={styles.warningCancelLabel}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={onJogar}
          style={styles.cta}
          accessibilityRole="button"
          accessibilityLabel="Jogar"
        >
          <Text style={styles.ctaLabel}>Jogar</Text>
        </Pressable>
        {onRestorePurchases ? (
          <Pressable
            onPress={onRestorePurchases}
            disabled={!!restoreBusy}
            style={[styles.restoreBtn, restoreBusy ? styles.restoreBtnBusy : null]}
            accessibilityRole="button"
            accessibilityLabel="Restaurar compras"
            accessibilityState={{ busy: !!restoreBusy, disabled: !!restoreBusy }}
          >
            <Text style={styles.restoreLabel}>{restoreBusy ? 'Restaurando…' : 'Restaurar compras'}</Text>
          </Pressable>
        ) : null}
        {hasActiveMatch && pendingIndex === null ? (
          <Text style={styles.footerNote}>Mudar de pista inicia um novo jogo</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    alignItems: 'stretch',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1a1d23',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
    color: '#8a8578',
    textAlign: 'center',
  },
  cardsRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  cardIdle: {
    borderColor: '#e7e4de',
  },
  cardSelected: {
    borderColor: '#E8A33D',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#E8A33D',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1d23',
  },
  cardSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
    color: '#8a8578',
  },
  cardTone: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
    color: '#8a8578',
  },
  warningBanner: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E8A33D',
    borderLeftWidth: 3,
    borderLeftColor: '#E8A33D',
    backgroundColor: '#fff7ec',
    borderRadius: 8,
    padding: 12,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1d23',
  },
  warningActions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  warningConfirm: {
    flex: 1,
    minHeight: HIT_TARGET,
    backgroundColor: '#E8A33D',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningConfirmLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1206',
  },
  warningCancel: {
    flex: 1,
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderColor: '#e7e4de',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  warningCancelLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1d23',
  },
  cta: {
    marginTop: 16,
    minHeight: HIT_TARGET,
    backgroundColor: '#E8A33D',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  ctaLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1206',
    fontVariant: ['tabular-nums'],
  },
  footerNote: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '500',
    color: '#8a8578',
    textAlign: 'center',
  },
  restoreBtn: {
    marginTop: 10,
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderColor: '#e7e4de',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
  },
  restoreBtnBusy: {
    opacity: 0.6,
  },
  restoreLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1d23',
  },
});
