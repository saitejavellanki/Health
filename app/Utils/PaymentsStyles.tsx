import { StyleSheet } from 'react-native';

// Zomato uses a predominantly red color scheme
// Primary colors from Zomato's palette
const colors = {
  primary: '#cb202d', // Zomato red
  primaryLight: '#ff5063', // Lighter shade of red
  primaryDark: '#9b0000', // Darker shade of red
  background: '#f8f8f8',
  white: '#ffffff',
  dark: '#333333',
  gray: '#8c8c8c',
  lightGray: '#e8e8e8',
  success: '#4caf50',
  rating: '#db7c38' // Zomato rating color (orange)
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
  },
  headerPlaceholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 16,
    color: colors.dark,
  },
  orderDetailsCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderTypeText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: colors.dark,
  },
  deliveryDetailsText: {
    fontSize: 16,
    color: colors.gray,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.lightGray,
    marginVertical: 16,
  },
  orderItemsTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    color: colors.dark,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderItemName: {
    flex: 1,
    fontSize: 14,
    color: colors.dark,
  },
  orderItemQuantity: {
    fontSize: 14,
    color: colors.gray,
    width: 32,
    textAlign: 'center',
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '500',
    width: 60,
    textAlign: 'right',
    color: colors.dark,
  },
  moreItemsText: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 8,
  },
  priceSummary: {
    marginTop: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: colors.gray,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.dark,
  },
  savingsLabel: {
    fontSize: 14,
    color: colors.success,
  },
  savingsValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.success,
  },
  totalRow: {
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  addressCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressIcon: {
    marginRight: 8,
    marginTop: 2,
    color: colors.primary,
  },
  addressText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: colors.dark,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    marginLeft: 4,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentMethodCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark,
  },
  paymentMethodTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.dark,
  },
  checkmark: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.primary,
  },
  payButtonContainer: {
    padding: 16,
    marginBottom: 32,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  payButtonProcessing: {
    backgroundColor: colors.gray,
  },
  payButtonComplete: {
    backgroundColor: colors.success,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    marginRight: 8,
  },
  securityNote: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: colors.dark,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    color: colors.dark,
  },
  modalFooter: {
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  paymentGatewayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  paymentGatewayText: {
    fontSize: 14,
    color: colors.gray,
    marginLeft: 6,
    fontWeight: '500',
  },
  // Adding missing styles used in PaymentScreen.js
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: colors.gray,
    marginTop: 12,
  },
  userInfoCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userGreeting: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: colors.dark,
  },
  userEmail: {
    fontSize: 14,
    color: colors.gray,
  },
  paymentInfoCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentInfoText: {
    fontSize: 14,
    color: colors.dark,
    marginBottom: 12,
    lineHeight: 20,
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    height: 56,
  },
  webViewBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  webViewBackText: {
    fontSize: 16,
    color: colors.primary,
    marginLeft: 4,
  },
  webViewTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginRight: 32, // To balance the back button
    color: colors.dark,
  },
  // Additional Zomato specific styles
  ratingBadge: {
    backgroundColor: colors.rating,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  ratingText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  offerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#eef7ee',
    borderRadius: 4,
    marginBottom: 12,
  },
  offerText: {
    fontSize: 14,
    color: '#3a9741',
    marginLeft: 6,
  },
});

// Adding default export to satisfy the routing system
export default function PaymentsStyles() {
  return null;
}