import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  // Location styles - KEPT UNCHANGED
  locationContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50, // Original value
  },
  locationInfo: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  locationTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 16, // Original value
    color: '#1a1a1a',
  },
  locationAddress: {
    fontFamily: 'Inter-Regular',
    fontSize: 14, // Original value
    color: '#64748b',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14, // Original value
    color: '#64748b',
    marginLeft: 8,
  },
  refreshButton: {
    padding: 8,
  },
  // Header styles - MORE REDUCED
  header: {
    padding: 16, // Further reduced from 18
    backgroundColor: '#f8fafc',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 22, // Further reduced from 24
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14, // Further reduced from 15
    color: '#64748b',
    lineHeight: 20,
  },
  // Section styles - MORE REDUCED
  section: {
    padding: 16, // Further reduced from 18
    paddingBottom: 4,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16, // Further reduced from 18
    color: '#1a1a1a',
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  // Order type selection styles - MORE REDUCED
  orderTypeContainer: {
    marginBottom: 10,
  },
  orderTypeCard: {
    backgroundColor: '#fff',
    borderRadius: 12, // Further reduced from 14
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderTypeCardSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  orderTypeIconContainer: {
    width: 32, // Further reduced from 36
    height: 32, // Further reduced from 36
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  orderTypeContent: {
    flex: 1,
  },
  orderTypeTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14, // Further reduced from 15
    color: '#1a1a1a',
    marginBottom: 2,
  },
  orderTypeDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12, // Further reduced from 13
    color: '#64748b',
  },
  orderTypeCheckmark: {
    width: 20, // Further reduced from 22
    height: 20, // Further reduced from 22
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  // Time slot styles - MORE REDUCED
  timeSlotCard: {
    backgroundColor: '#fff',
    borderRadius: 8, // Further reduced from 10
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeSlotCardSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  timeSlotContent: {
    flex: 1,
  },
  timeSlotText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14, // Further reduced from 15
    color: '#1a1a1a',
    marginBottom: 2,
  },
  timeSlotBadge: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  timeSlotBadgeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10, // Further reduced from 11
    color: '#0ea5e9',
  },
  // Subscription plan styles - MORE REDUCED
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12, // Further reduced from 14
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#22c55e',
  },
  planImage: {
    width: '100%',
    height: 120, // Further reduced from 140
    resizeMode: 'cover',
  },
  savingsBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#22c55e',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  savingsBadgeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10, // Further reduced from 11
    color: '#fff',
  },
  planContent: {
    padding: 12,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  planTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16, // Further reduced from 17
    color: '#1a1a1a',
  },
  planPrice: {
    fontFamily: 'Inter-Bold',
    fontSize: 16, // Further reduced from 17
    color: '#22c55e',
  },
  planDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12, // Further reduced from 13
    color: '#64748b',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24, // Further reduced from 28
    height: 24, // Further reduced from 28
    borderRadius: 12,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Duration selection styles - MORE REDUCED
  durationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  durationCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8, // Further reduced from 10
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    position: 'relative',
  },
  durationCardSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  durationText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14, // Further reduced from 15
    color: '#1a1a1a',
    marginBottom: 2,
  },
  durationBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  durationBadgeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10, // Further reduced from 11
    color: '#22c55e',
  },
  smallCheckmark: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20, // Further reduced from 22
    height: 20, // Further reduced from 22
    borderRadius: 10,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Product styles - MORE REDUCED
  categoryTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16, // Further reduced from 17
    color: '#1a1a1a',
    marginBottom: 8,
  },
  productList: {
    paddingBottom: 8,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 8, // Further reduced
    width: 130, // Further reduced from 140
    marginRight: 8, // Further reduced
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4, // Further reduced
    elevation: 1, // Further reduced
    marginBottom: 4,
  },
  productImage: {
    width: '100%',
    height: 80, // Further reduced from 90
    resizeMode: 'cover',
  },
  deliveryBadge: {
    position: 'absolute',
    top: 4, // Further reduced
    right: 4, // Further reduced
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 4, // Further reduced
    paddingVertical: 1, // Further reduced
    borderRadius: 6, // Further reduced
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  deliveryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 7, // Further reduced
    color: '#22c55e',
    marginLeft: 1, // Further reduced
  },
  productInfo: {
    padding: 6, // Further reduced
  },
  productName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11, // Further reduced
    color: '#1a1a1a',
    marginBottom: 1, // Further reduced
  },
  weightText: {
    fontFamily: 'Inter-Regular',
    fontSize: 9, // Further reduced
    color: '#64748b',
    marginBottom: 4, // Further reduced
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  priceText: {
    fontFamily: 'Inter-Bold',
    fontSize: 12, // Further reduced
    color: '#1a1a1a',
  },
  addButton: {
    width: 24, // Further reduced
    height: 24, // Further reduced
    borderRadius: 12, // Further reduced
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityControl: {
    height: 24, // Further reduced
    width: 72, // Further reduced
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2, // Already at minimum
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12, // Further reduced
    backgroundColor: '#fff',
  },
  quantityButton: {
    width: 20, // Further reduced
    height: 20, // Further reduced
    borderRadius: 10, // Further reduced
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11, // Further reduced
    color: '#1a1a1a',
  },
  
  // Updated category styles - MORE REDUCED
  categoryContainer: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16, // Further reduced from 17
    color: '#1a1a1a',
    marginBottom: 8,
    marginLeft: 4,
  },
  itemsSelectedText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12, // Further reduced from 13
    color: '#64748b',
  },
  // Summary styles - MORE REDUCED
  summaryContainer: {
    backgroundColor: '#fff',
    borderRadius: 12, // Further reduced from 14
    padding: 14, // Further reduced from 16
    marginHorizontal: 16, // Further reduced from 20
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16, // Further reduced from 17
    color: '#1a1a1a',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14, // Further reduced from 15
    color: '#64748b',
  },
  summaryValue: {
    fontFamily: 'Inter-Medium',
    fontSize: 14, // Further reduced from 15
    color: '#1a1a1a',
  },
  savingsLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14, // Further reduced from 15
    color: '#22c55e',
  },
  savingsValue: {
    fontFamily: 'Inter-Medium',
    fontSize: 14, // Further reduced from 15
    color: '#22c55e',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 2,
    paddingTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16, // Further reduced from 17
    color: '#1a1a1a',
  },
  totalValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 16, // Further reduced from 18
    color: '#22c55e',
  },
  // Footer styles - MORE REDUCED
  footer: {
    paddingHorizontal: 16, // Further reduced from 20
    paddingVertical: 12, // Further reduced from 16
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  button: {
    backgroundColor: '#22c55e',
    borderRadius: 8, // Further reduced from 10
    paddingVertical: 12, // Further reduced from 14
    paddingHorizontal: 16, // Further reduced from 20
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  buttonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14, // Further reduced from 15
    color: '#fff',
    marginRight: 4,
  },
  buttonTextDisabled: {
    color: '#94a3b8',
  },
});