import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { enqueue, initialiseOfflineStore, queued } from "../src/db/offline";

export default function Home() {
  const [parcelCode,setParcelCode]=useState(""); const [count,setCount]=useState(0);
  useEffect(()=>{initialiseOfflineStore();setCount(queued().length)},[]);
  const save=()=>{if(!parcelCode.trim())return;enqueue("CREATE_FIELD_APPLICATION",{parcelCode,capturedAt:new Date().toISOString()});setParcelCode("");setCount(queued().length)};
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
    <Text style={s.eyebrow}>ANAGU FIELD</Text><Text style={s.title}>Land evidence, even beyond the network.</Text>
    <Text style={s.body}>Capture parcel applications locally. Records remain queued until a secure connection returns.</Text>
    <View style={s.status}><View><Text style={s.label}>OFFLINE OUTBOX</Text><Text style={s.metric}>{count} queued</Text></View><View style={s.ready}><Text style={s.readyText}>Device ready</Text></View></View>
    <View style={s.card}><Text style={s.cardTitle}>New field record</Text><Text style={s.label}>PARCEL CODE</Text><TextInput style={s.input} value={parcelCode} onChangeText={setParcelCode} placeholder="AN-LA-001"/>
      <Text style={s.label}>CAPTURE CHECKLIST</Text>{["Applicant identity","GPS parcel boundary","Survey plan","Witness evidence"].map((x,i)=><View style={s.row} key={x}><Text style={s.num}>{i+1}</Text><Text>{x}</Text></View>)}
      <TouchableOpacity style={s.button} onPress={save}><Text style={s.buttonText}>Save securely offline</Text></TouchableOpacity>
    </View>
  </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:"#f5f3ea"},page:{padding:24,gap:16},eyebrow:{fontSize:12,fontWeight:"800",letterSpacing:2,color:"#287a57"},
  title:{fontSize:38,lineHeight:43,fontFamily:"serif",color:"#15241d"},body:{fontSize:16,lineHeight:24,color:"#65736b"},
  status:{backgroundColor:"#123d2d",padding:20,borderRadius:16,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  label:{fontSize:11,fontWeight:"800",letterSpacing:1,color:"#718078",marginTop:10},metric:{fontSize:25,color:"white",fontFamily:"serif",marginTop:5},
  ready:{backgroundColor:"#245842",padding:8,borderRadius:20},readyText:{color:"#d9f3e3",fontWeight:"700",fontSize:12},
  card:{backgroundColor:"#fffdf7",padding:20,borderRadius:16,gap:10},cardTitle:{fontSize:22,fontFamily:"serif",color:"#15241d"},
  input:{borderWidth:1,borderColor:"#d9ddd5",borderRadius:9,padding:13,backgroundColor:"white"},row:{flexDirection:"row",alignItems:"center",gap:12,paddingVertical:9},
  num:{width:27,height:27,textAlign:"center",paddingTop:4,borderRadius:14,backgroundColor:"#dcebe2",fontWeight:"800",color:"#185c3f"},
  button:{backgroundColor:"#185c3f",padding:15,borderRadius:10,alignItems:"center",marginTop:12},buttonText:{color:"white",fontWeight:"800"}
});
