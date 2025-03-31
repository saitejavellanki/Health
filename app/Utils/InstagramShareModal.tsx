import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { SafeAreaView, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export const ShareableContent = ({ memories, onClose, onSaveSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [totalCalories, setTotalCalories] = useState(0);
  const viewShotRef = React.useRef();
  const windowWidth = Dimensions.get('window').width;
  const insets = useSafeAreaInsets();
  
  // Log props to verify data
  console.log('ShareableContent - memories count:', memories?.length);
  console.log('First memory:', memories?.length > 0 ? memories[0].id : 'No memories');
  
  // Calculate grid layout dimensions
  const padding = 16;
  const gridGap = 4;
  const columns = 4;
  const availableWidth = windowWidth - (padding * 2);
  const imageSize = (availableWidth - (gridGap * (columns - 1))) / columns;
  
  // Calculate total calories on component mount
  useEffect(() => {
    if (memories && memories.length > 0) {
      const total = memories.reduce((sum, memory) => sum + (memory.calories || 0), 0);
      setTotalCalories(total);
    }
  }, [memories]);
  
  // Save and share the content
  const captureAndShare = async () => {
    setLoading(true);
    
    try {
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your media library');
        setLoading(false);
        return;
      }
      
      // Capture the view as an image
      const uri = await viewShotRef.current.capture();
      console.log('Captured image URI:', uri);
      
      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(uri);
      console.log('Created asset:', asset);
      
      // Notify user
      Alert.alert(
        'Saved to Gallery',
        'Your CrunchX summary has been saved to your photo gallery and is ready to share!',
        [
          { 
            text: 'Share Now', 
            onPress: async () => {
              try {
                if (Platform.OS === 'ios') {
                  await Sharing.shareAsync(uri);
                } else {
                  // For Android, create a shareable file
                  const shareableUri = FileSystem.cacheDirectory + 'crunchx_summary.png';
                  await FileSystem.copyAsync({
                    from: uri,
                    to: shareableUri
                  });
                  await Sharing.shareAsync(shareableUri);
                }
              } catch (error) {
                console.error('Error sharing:', error);
                Alert.alert('Sharing failed', 'There was an error sharing your content.');
              }
              if (onSaveSuccess) onSaveSuccess();
            }
          },
          { 
            text: 'Done', 
            onPress: () => {
              if (onSaveSuccess) onSaveSuccess();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error capturing and sharing:', error);
      Alert.alert('Sharing failed', 'There was an error creating your shareable content.');
    } finally {
      setLoading(false);
    }
  };
  
  // Get a subset of memories to display (max 12 for better layout)
  const displayMemories = memories && memories.length > 0 ? memories.slice(0, 12) : [];
  
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <View style={[
        styles.header,
        { paddingTop: insets.top > 0 ? insets.top + 12 : 12 }
      ]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <Feather name="x" size={20} color="#ffffff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Create Summary</Text>
        
        <TouchableOpacity
          style={styles.shareButton}
          onPress={captureAndShare}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Feather name="download" size={20} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.contentContainer}>
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 0.9 }}
          style={styles.viewShot}
        >
          {/* Shareable Content */}
          <View style={styles.shareCard}>
            {/* Header with Logo */}
            <View style={styles.cardHeader}>
              <Text style={styles.logoText}>
                Crunch<Text style={styles.redX}>X</Text>
              </Text>
              
              <View style={styles.calorieContainer}>
                <Feather name="zap" size={18} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.calorieText}>{totalCalories.toLocaleString()} calories</Text>
              </View>
            </View>
            
            {/* Image Grid */}
            <View style={styles.gridContainer}>
              {displayMemories.map((item, index) => (
                <Image 
                  key={index}
                  source={{ uri: item.image }}
                  style={[
                    styles.gridImage,
                    { 
                      width: imageSize, 
                      height: imageSize,
                      marginRight: (index + 1) % columns !== 0 ? gridGap : 0,
                      marginBottom: index < displayMemories.length - columns ? gridGap : 0
                    }
                  ]}
                />
              ))}
            </View>
            
            {/* Footer */}
            <View style={styles.cardFooter}>
              <Text style={styles.footerText}>My Food Journey</Text>
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString('en-US', { 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </Text>
            </View>
          </View>
        </ViewShot>
      </View>
      
      <View style={styles.infoContainer}>
        <Feather name="info" size={16} color="#a3a3a3" style={{ marginRight: 8 }} />
        <Text style={styles.infoText}>
          This image will be saved to your gallery, ready to share on Instagram
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  viewShot: {
    width: '100%',
    alignItems: 'center',
  },
  shareCard: {
    width: '100%',
    aspectRatio: 4/5, // Instagram-friendly aspect ratio
    backgroundColor: '#111111',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  redX: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  calorieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  calorieText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  gridContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  gridImage: {
    borderRadius: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  footerText: {
    color: '#a3a3a3',
    fontSize: 14,
    fontWeight: '500',
  },
  dateText: {
    color: '#a3a3a3',
    fontSize: 14,
    fontWeight: '500',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#111111',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  infoText: {
    color: '#a3a3a3',
    fontSize: 14,
    flex: 1,
  }
});

// Main component to integrate with your existing code
const InstagramShareModal = ({ isVisible, memories, onClose }) => {
  if (!isVisible) return null;
  
  return (
    <SafeAreaProvider>
      <ShareableContent 
        memories={memories}
        onClose={onClose}
        onSaveSuccess={() => {
          // Optionally do something after successful save
          onClose();
        }}
      />
    </SafeAreaProvider>
  );
};

export default InstagramShareModal;