
import { StyleSheet } from 'react-native';

 export const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8fafc',
    },
    // Location styles
    locationContainer: {
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      backgroundColor: '#fff',
    },
    locationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      paddingTop: 50, // Extra padding for status bar
    },
    locationInfo: {
      flex: 1,
      marginLeft: 8,
      marginRight: 8,
    },
    locationTitle: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: '#1a1a1a',
    },
    locationAddress: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: '#64748b',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    loadingText: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: '#64748b',
      marginLeft: 8,
    },
    refreshButton: {
      padding: 8,
    },
    // Header styles
    header: {
      padding: 24,
      backgroundColor: '#f8fafc',
    },
    title: {
      fontFamily: 'Inter-Bold',
      fontSize: 28,
      color: '#1a1a1a',
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: '#64748b',
      lineHeight: 24,
    },
    // Section styles
    section: {
      padding: 24,
      paddingBottom: 8,
    },
    sectionTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 20,
      color: '#1a1a1a',
      marginBottom: 16,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    // Order type selection styles
    orderTypeContainer: {
      marginBottom: 16,
    },
    orderTypeCard: {
      backgroundColor: '#fff',
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    orderTypeCardSelected: {
      borderColor: '#22c55e',
      backgroundColor: '#f0fdf4',
    },
    orderTypeIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#f0fdf4',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    orderTypeContent: {
      flex: 1,
    },
    orderTypeTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: '#1a1a1a',
      marginBottom: 4,
    },
    orderTypeDescription: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: '#64748b',
    },
    orderTypeCheckmark: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#22c55e',
    },
    // Time slot styles
    timeSlotCard: {
      backgroundColor: '#fff',
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      padding: 16,
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
      fontSize: 16,
      color: '#1a1a1a',
      marginBottom: 4,
    },
    timeSlotBadge: {
      backgroundColor: '#f0f9ff',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      alignSelf: 'flex-start',
    },
    timeSlotBadgeText: {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
      color: '#0ea5e9',
    },
    // Subscription plan styles
    planCard: {
      backgroundColor: '#fff',
      borderRadius: 16,
      marginBottom: 16,
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
      height: 160,
      resizeMode: 'cover',
    },
    savingsBadge: {
      position: 'absolute',
      top: 12,
      left: 12,
      backgroundColor: '#22c55e',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    savingsBadgeText: {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
      color: '#fff',
    },
    planContent: {
      padding: 16,
    },
    planHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    planTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 18,
      color: '#1a1a1a',
    },
    planPrice: {
      fontFamily: 'Inter-Bold',
      fontSize: 18,
      color: '#22c55e',
    },
    planDescription: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: '#64748b',
    },
    checkmark: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#22c55e',
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Duration selection styles
    durationContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    durationCard: {
      width: '48%',
      backgroundColor: '#fff',
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      padding: 16,
      position: 'relative',
    },
    durationCardSelected: {
      borderColor: '#22c55e',
      backgroundColor: '#f0fdf4',
    },
    durationText: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: '#1a1a1a',
      marginBottom: 4,
    },
    durationBadge: {
      backgroundColor: '#f0fdf4',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      alignSelf: 'flex-start',
    },
    durationBadgeText: {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
      color: '#22c55e',
    },
    smallCheckmark: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#22c55e',
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Product styles
    // categoryContainer: {
    //   marginBottom: 24,
    // },
    categoryTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 18,
      color: '#1a1a1a',
      marginBottom: 12,
    },
    productList: {
      paddingBottom: 16,
    },
    productCard: {
      backgroundColor: '#fff',
      borderRadius: 12, // Reduced from 16
      width: 140, // Reduced from 180
      marginRight: 12, // Reduced from 16
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6, // Reduced from 8
      elevation: 2, // Reduced from 3
      marginBottom: 8,
    },
    productImage: {
      width: '100%',
      height: 100, // Reduced from 140
      resizeMode: 'cover',
    },
    deliveryBadge: {
      position: 'absolute',
      top: 6, // Reduced from 8
      right: 6, // Reduced from 8
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      paddingHorizontal: 6, // Reduced from 8
      paddingVertical: 3, // Reduced from 4
      borderRadius: 10, // Reduced from 12
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 1,
    },
    deliveryText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 9, // Reduced from 10
      color: '#22c55e',
      marginLeft: 2, // Reduced from 3
    },
    productInfo: {
      padding: 10, // Reduced from 12
    },
    productName: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 13, // Reduced from 15
      color: '#1a1a1a',
      marginBottom: 2, // Reduced from 4
    },
    weightText: {
      fontFamily: 'Inter-Regular',
      fontSize: 11, // Reduced from 13
      color: '#64748b',
      marginBottom: 8, // Reduced from 12
    },
    priceContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
    },
    priceText: {
      fontFamily: 'Inter-Bold',
      fontSize: 14, // Reduced from 16
      color: '#1a1a1a',
    },
    addButton: {
      width: 28, // Reduced from 32
      height: 28, // Reduced from 32
      borderRadius: 14, // Reduced from 16
      backgroundColor: '#22c55e',
      justifyContent: 'center',
      alignItems: 'center',
    },
    quantityControl: {
      height: 28, // Reduced from 32
      width: 80, // Reduced from 96
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 3, // Reduced from 4
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 14, // Reduced from 16
      backgroundColor: '#fff',
    },
    quantityButton: {
      width: 24, // Reduced from 28
      height: 24, // Reduced from 28
      borderRadius: 12, // Reduced from 14
      backgroundColor: '#f8fafc',
      justifyContent: 'center',
      alignItems: 'center',
    },
    quantityText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 13, // Reduced from 14
      color: '#1a1a1a',
    },
    
    // Updated category styles
    categoryContainer: {
      marginBottom: 24,
    },
    categoryTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 18,
      color: '#1a1a1a',
      marginBottom: 16,
      marginLeft: 4,
    },
    itemsSelectedText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: '#64748b',
    },
    // Summary styles
    summaryContainer: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 20,
      marginHorizontal: 24,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    summaryTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 18,
      color: '#1a1a1a',
      marginBottom: 16,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    summaryLabel: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: '#64748b',
    },
    summaryValue: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: '#1a1a1a',
    },
    savingsLabel: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: '#22c55e',
    },
    savingsValue: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: '#22c55e',
    },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
      marginTop: 4,
      paddingTop: 12,
      marginBottom: 0,
    },
    totalLabel: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 18,
      color: '#1a1a1a',
    },
    totalValue: {
      fontFamily: 'Inter-Bold',
      fontSize: 20,
      color: '#22c55e',
    },
    // Footer styles
    footer: {
      paddingHorizontal: 24,
      paddingVertical: 20,
      backgroundColor: '#fff',
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
    },
    button: {
      backgroundColor: '#22c55e',
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 24,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonDisabled: {
      backgroundColor: '#e2e8f0',
    },
    buttonText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: '#fff',
      marginRight: 8,
    },
    buttonTextDisabled: {
      color: '#94a3b8',
    },
  });