#pragma once
String shopCategory="all";
bool ownedOnly=false;
bool shopOwns(const String &group,const String &id){
 if(group=="treasures")return game.state["rareInventory"][id].as<int>()>0;
 if(group=="items"||group=="tools")return Game::contains(game.state[group=="items"?"owned":"ownedTools"],id);
 return Game::contains(game.state["home"][group=="themes"?"ownedThemes":"owned"],id);
}
void collection(const String &group){
 JsonArrayConst all;if(group=="items"||group=="tools"||group=="treasures")all=game.catalog[group];else all=game.catalog["home"][group=="furniture"?"items":group];
 std::vector<JsonVariantConst> list;for(auto i:all){String id=i["id"];if(ownedOnly&&!shopOwns(group,id))continue;if(group=="items"&&shopCategory!="all"&&i["category"]!=shopCategory)continue;list.push_back(i);}
 if(group=="items")button(12,35,104,25,shopCategory,"shopcategory");else label(12,43,String(game.state["balance"].as<int>())+" stars",1,GOLD);
 button(124,35,104,25,ownedOnly?"Owned only":"All items","shopowned");navList(list.size());if(group=="tools")button(85,205,70,29,"Default","resettool");
 if(list.empty())label(12,96,"No items in this filter");
 for(int row=0;row<3;row++){int index=listPage*3+row;if(index>=int(list.size()))break;auto item=list[index];String id=item["id"];int y=65+row*44;rect(10,y,220,40,0x384841);
  String art=group=="items"||group=="tools"?id+"_0":group=="treasures"?"rare_"+id:"home_"+id;sprite(art,13,y+4,.8);
  String name=item["name"];label(52,y+6,name.substring(0,fitBytes(name,170,unicodeText(name))));String sub=group=="treasures"?"Owned: "+game.state["rareInventory"][id].as<String>():shopOwns(group,id)?"Owned":item["recipe"].isNull()?String(item["cost"].as<int>())+" stars":"Craft with materials";label(52,y+23,sub,1,GOLD);targets[targetCount++]={10,y,220,40,"detail:"+group+":"+id};
 }
}
void outfitPreview(){
 JsonDocument preview;preview.to<JsonArray>();for(JsonVariantConst id:game.state["equipped"].as<JsonArrayConst>())if(selectedGroup!="items"||game.item("items",id.as<String>())["category"]!=game.item("items",selected)["category"])preview.as<JsonArray>().add(id);
 if(selectedGroup=="items")preview.as<JsonArray>().add(selected);
 mole(90,70,2.2,game.state["profile"],preview.as<JsonVariantConst>(),selectedGroup=="tools"?selected:game.state["tool"]|"basic");
}
