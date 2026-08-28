import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HIT_TARGET } from './PauseButton';

export function CeilingBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <View style={styles.banner} accessibilityLabel="indicador de teto">
      <View style={styles.bannerAccent} />
      <View style={styles.bannerContent}>
        <Text style={styles.bannerText}>Teto aberto — peças maiores podem surgir.</Text>
        {/* TODO 5.4: t('accelerated.ceilingHint') */}
        <Pressable onPress={onDismiss} style={styles.dismissBtn} accessibilityRole="button" accessibilityLabel="Dispensar">
          <Text style={styles.dismissLabel}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function StuckBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <View style={styles.banner} accessibilityLabel="aviso de travamento">
      <View style={styles.bannerAccent} />
      <View style={styles.bannerContent}>
        <Text style={styles.bannerText}>Pouco espaço — procure fusões.</Text>
        {/* TODO 5.4: t('accelerated.stuckHint') */}
        <Pressable onPress={onDismiss} style={styles.dismissBtn} accessibilityRole="button" accessibilityLabel="Dispensar">
          <Text style={styles.dismissLabel}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function RewardPrompt({
  title,
  onAd,
  onIap,
  onCancel,
}: {
  title: string;
  onAd: () => void;
  onIap: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.prompt} accessibilityLabel={title}>
      <Text style={styles.promptTitle}>{title}</Text>
      <View style={styles.promptRow}>
        <Pressable onPress={onAd} style={styles.adBtn} accessibilityRole="button" accessibilityLabel="Ver anúncio">
          <Text style={styles.adLabel}>Ver anúncio</Text>
        </Pressable>
        <Pressable onPress={onIap} style={styles.iapBtn} accessibilityRole="button" accessibilityLabel="Comprar">
          <Text style={styles.iapLabel}>Comprar</Text>
        </Pressable>
      </View>
      <Pressable onPress={onCancel} style={styles.cancelBtn} accessibilityRole="button" accessibilityLabel="Cancelar">
        <Text style={styles.cancelLabel}>Cancelar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    backgroundColor: '#fff7ec',
    borderWidth: 1,
    borderColor: '#E8A33D',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  bannerAccent: {
    width: 3,
    backgroundColor: '#E8A33D',
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1d23',
  },
  dismissBtn: {
    minWidth: HIT_TARGET,
    minHeight: HIT_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  dismissLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1d23',
  },
  prompt: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e7e4de',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  promptTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1d23',
    textAlign: 'center',
  },
  promptRow: {
    flexDirection: 'row',
    gap: 8,
  },
  adBtn: {
    flex: 1,
    minHeight: HIT_TARGET,
    backgroundColor: '#E8A33D',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1206',
  },
  iapBtn: {
    flex: 1,
    minHeight: HIT_TARGET,
    backgroundColor: '#1a1d23',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iapLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  cancelBtn: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderColor: '#e7e4de',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  cancelLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1d23',
  },
});
