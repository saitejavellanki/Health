import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backButtonContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 999,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 30,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 16,
    color: '#f8fafc',
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 36,
    textAlign: 'center',
    color: '#cbd5e1',
    paddingHorizontal: 20,
  },
  permissionButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Camera screen styles
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerTitleContainer: {
    marginLeft:45,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  cameraTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF', // White color for dark background
    textAlign: 'center',
    lineHeight: 28, // Adding lineHeight to ensure consistent baseline
  },
  redX: {
    color: '#ef4444', // Red color for the X
    fontFamily: 'Inter-Bold',
    includeFontPadding: false, // Helps with text alignment issues
  },
  analyzingText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 280,
    height: 280,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16,
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#22c55e',
    backgroundColor: 'transparent',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  instructionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 20,
    fontWeight: '500',
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsPortion: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 60,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
  },

  // Image review screen - updated with black theme
  imageContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageContent: {
    flex: 1,
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  
  captureButtonInnerDisabled: {
    backgroundColor: '#888888',
  },
  
  limitReachedText: {
    position: 'absolute',
    bottom: -24,
    color: '#ff4d4d',
    fontSize: 12,
    fontWeight: '600',
    width: 100,
    textAlign: 'center',
  },
  
  tokenInfoContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
  },
  
  tokenInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
    marginBottom: 6,
  },
  
  tokenInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  tokenProgressContainer: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 3,
    marginRight: 10,
  },
  
  tokenProgressBar: {
    height: 6,
    backgroundColor: '#22c55e',
    borderRadius: 3,
  },
  
  tokenInfoText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  
  analysesRemainingText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#111111',
  },
  
  imageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  // tokenInfoContainer: {
  //   marginTop: 16,
  //   padding: 12,
  //   backgroundColor: 'rgba(34, 197, 94, 0.1)',
  //   borderRadius: 8,
  //   borderLeftWidth: 3,
  //   borderLeftColor: '#22c55e',
  // },
  // tokenInfoTitle: {
  //   fontSize: 14,
  //   fontWeight: '600',
  //   color: '#22c55e',
  //   marginBottom: 6,
  // },
  // tokenInfoRow: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'space-between',
  // },
  // tokenProgressContainer: {
  //   flex: 1,
  //   height: 6,
  //   backgroundColor: 'rgba(34, 197, 94, 0.2)',
  //   borderRadius: 3,
  //   marginRight: 10,
  // },
  // tokenProgressBar: {
  //   height: 6,
  //   backgroundColor: '#22c55e',
  //   borderRadius: 3,
  // },
  // tokenInfoText: {
  //   fontSize: 12,
  //   color: '#333',
  //   fontWeight: '500',
  // },
  // analysesRemainingText: {
  //   fontSize: 12,
  //   color: '#666',
  //   marginTop: 4,
  //   fontWeight: '500',
  // },
  // backButton: {
  //   width: 40,
  //   height: 40,
  //   borderRadius: 20,
  //   backgroundColor: 'rgba(0, 0, 0, 0.3)',
  //   alignItems: 'center',
  //   justifyContent: 'center',
  // },
  resultContainer: {
    padding: 24,
    backgroundColor: '#000000',
  },
  foodNameContainer: {
    marginBottom: 24,
  },
  foodNameText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  nutritionGrid: {
    flexDirection: 'column',  // Change from 'row' to 'column'
    marginBottom: 30,
    alignItems: 'flex-start',  // Replace justifyContent with alignItems
  },
  nutritionItem: {
    flexDirection: 'row',     // Make each item a row
    alignItems: 'center',     // Center items vertically
    marginBottom: 16,         // Add space between rows (instead of marginRight)
    width: '100%',            // Make each row take full width
  },
  nutritionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,          // Add margin right instead of marginBottom
    marginBottom: 0,          // Remove bottom margin
  },
  nutritionValue: {
    fontSize: 22,             // Consider reducing from 30 for better fit in a row
    fontWeight: '700',
    color: '#ffffff',
    marginRight: 8,           // Add right margin
    marginTop: 0,             // Remove top margin
    marginBottom: 0,          // Remove bottom margin
  },
  nutritionUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  nutritionLabel: {
    fontSize: 16,             // Increase from 14 for better visibility
    color: '#9ca3af',
    marginTop: 0,             // Remove top margin
    marginLeft: 'auto',       // Optional: pushes the label to the right side
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    minHeight: 250,
  },
  loadingCard: {
    backgroundColor: '#111111',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    width: '85%',
  },
  // Add these to the styles object
  scanModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom:10,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  scanModeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    marginLeft: 6,
  },
  

scanModeButtonTextActive: {
  color: '#22c55e',
  fontWeight: '600',
},
scanModeIndicator: {
  fontSize: 12,
  color: '#9ca3af',
  marginTop: 4,
},
junkFoodIndicator: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(249, 115, 22, 0.1)',
  padding: 12,
  borderRadius: 8,
  marginBottom: 24,
},
junkFoodText: {
  color: '#f97316',
  marginLeft: 8,
  fontSize: 14,
  fontWeight: '500',
},

  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  actionContainer: {
    padding: 24,
    marginTop: 12,
  },
  analyzeButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  logMealButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  newPhotoButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  analyzeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '500',
  },
  logMealButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  newPhotoButtonText: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '500',
  },
  // New styles for meal logged confirmation
  mealLoggedContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  mealLoggedText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
  },
  sublineText: {
    fontSize: 12,
    color: '#a3a3a3',
    marginTop: 2,
  },
});

export default styles;
